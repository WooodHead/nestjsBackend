import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { addMonths } from 'date-fns';
import { InjectRepository } from '@nestjs/typeorm';
import * as Yup from 'yup';
import * as argon2 from 'argon2';
import { Document } from '../profile/entities/document.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import registerSchema from './schema/registerInput.schema';
import { CheckField } from './type/checkResponse';
import { RegisterUserDto } from './type/registerInput';
import { Error, UserResponse } from './type/userResponse';
import { JwtService } from '@nestjs/jwt';
import { sendEmail } from './util/sendEmail';
import { OrganizationService } from '../organization/organization.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { saveLogs } from 'src/util/logger';
import { UserSubscriptionService } from 'src/user-subscription/user-subscription.service';
import { Subscription } from 'src/subscription/entities/subscription.entity';
import { SubscriptionStatus } from 'src/user-subscription/type/userSubscriptionTypes';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Subscription)
    private subRepository: Repository<Subscription>,

    private organizationService: OrganizationService,

    private jwtService: JwtService,

    @Inject(forwardRef(() => UserSubscriptionService))
    private userSubscriptionService: UserSubscriptionService, //private subscriptionService: SubscriptionService,
  ) {}

  async validateRegisterInput(
    registerArgs: RegisterUserDto,
  ): Promise<UserResponse> {
    try {
      await registerSchema.validate({ ...registerArgs }, { abortEarly: false });
      const { password, email, profileType } = registerArgs;
      const emailExist = await this.checkEmailExist(email);
      if (emailExist.success) {
        return {
          data: null,
          error: emailExist.error,
          success: false,
        };
      }

      const hashedPassword = await argon2.hash(password);
      if (profileType === 'Individual') {
        return await this.registerUser({
          ...registerArgs,
          password: hashedPassword,
        });
      }
      if (profileType === 'Organization') {
        return await this.registerOrganization({
          ...registerArgs,
          password: hashedPassword,
        });
      }
    } catch (error) {
      const validationErrors: [Error] = [{}]; // Adding an empty field for type.
      validationErrors.pop(); // Removing the empty added item
      if (error) {
        error.inner.forEach((d) =>
          validationErrors.push({ field: d.path, message: d.errors[0] }),
        );
        return {
          data: null,
          error: validationErrors,
          success: false,
        };
      } else {
        return {
          data: null,
          error: null,
          success: false,
        };
      }
    }
  }

  async registerUser(registerArgs: RegisterUserDto): Promise<UserResponse> {
    try {
      delete registerArgs.organization;
      const newUser: User = new User();
      Object.keys(registerArgs).forEach((key) => {
        if (key === 'email') {
          return (newUser[key] = registerArgs[key].toLowerCase());
        }
        if (key === 'referralCode') {
          return (newUser[key] = registerArgs[key]
            ? registerArgs[key].toUpperCase()
            : 'N/A');
        }
        newUser[key] = registerArgs[key];
      });
      const userProfile: Profile = new Profile();
      const userDocument: Document = new Document();
      userProfile.verificationStatus = 'Not Verified';
      userProfile.avatar = process.env.AWS_BLANK_AVATAR;
      newUser.profile = userProfile;
      newUser.documents = userDocument;
      const user: User = await this.userRepository.save(newUser);
      if (user) {
        const { id, firstName, lastName, email, userType } = user;

        if (userType == 'Buyer') {
          const regularBuyerSubscriptionId = await this.subRepository.findOneOrFail(
            {
              where: {
                user_type: 'Buyer',
                type: 'Regular',
                duration: 3,
                amount: parseInt('0'),
              },
              select: ['id'],
            },
          );

          await this.userSubscriptionService.create({
            user: id,
            subscription: regularBuyerSubscriptionId.id,
            renewed_at: new Date(Date.now()),
            expires_at: addMonths(new Date(), 3),
            status: SubscriptionStatus.active,
          });
        }

        if (userType == 'Provider') {
          const regularProviderSubscriptionId = await this.subRepository.findOneOrFail(
            {
              where: {
                user_type: 'Provider',
                type: 'Regular',
                duration: 60,
              },
              select: ['id'],
            },
          );

          await this.userSubscriptionService.create({
            user: id,
            subscription: regularProviderSubscriptionId.id,
            renewed_at: new Date(Date.now()),
            expires_at: addMonths(new Date(), 60),
            status: SubscriptionStatus.active,
          });
        }

        const accountActivationToken = this.jwtService.sign(
          { id: user.id },
          { expiresIn: process.env.ACTIVATION_EMAIL_LIFE },
        );

        const activationURL = `${process.env.ORIGIN}/user/welcome/${accountActivationToken}`;
        sendEmail({
          emailType: 'account_activation',
          email,
          messageBody: { firstName, lastName, activationURL },
        });
        return {
          success: true,
          data: { ...user, password: '' },
          error: null,
        };
      }
      return {
        success: false,
        data: null,
        error: [
          {
            field: 'server',
            message: 'Internal Server Error',
          },
        ],
      };
    } catch (err) {
      saveLogs(this.logger, 'at creating a new individual user', err);
      return {
        success: false,
        data: null,
        error: [
          {
            field: 'server',
            message: 'Internal Server Error',
          },
        ],
      };
    }
  }

  async registerOrganization(
    registerArgs: RegisterUserDto,
  ): Promise<UserResponse> {
    try {
      const organizationName: string = registerArgs.organization;
      delete registerArgs.organization;
      const newUser: User = new User();
      Object.keys(registerArgs).forEach((key) => {
        if (key === 'email') {
          return (newUser[key] = registerArgs[key].toLowerCase());
        }
        newUser[key] = registerArgs[key];
      });
      const userProfile: Profile = new Profile();
      const userDocument: Document = new Document();
      userProfile.verificationStatus = 'Not Verified';
      userProfile.avatar = process.env.AWS_BLANK_AVATAR;
      newUser.profile = userProfile;
      newUser.documents = userDocument;
      const user: User = await this.userRepository.save(newUser);
      if (user) {
        const { id, firstName, lastName, email, userType } = user;
        if (userType == 'Buyer') {
          const regularBuyerSubscriptionId = await this.subRepository.findOneOrFail(
            {
              where: {
                user_type: 'Buyer',
                type: 'Regular',
                duration: 3,
                amount: parseInt('0'),
              },
              select: ['id'],
            },
          );
          await this.userSubscriptionService.create({
            user: id,
            subscription: regularBuyerSubscriptionId.id,
            renewed_at: new Date(Date.now()),
            expires_at: addMonths(new Date(), 3),
            status: SubscriptionStatus.active,
          });
        }

        if (userType == 'Provider') {
          const regularProviderSubscriptionId = await this.subRepository.findOneOrFail(
            {
              where: {
                user_type: 'Provider',
                type: 'Regular',
                duration: 60,
              },
              select: ['id'],
            },
          );

          await this.userSubscriptionService.create({
            user: id,
            subscription: regularProviderSubscriptionId.id,
            renewed_at: new Date(Date.now()),
            expires_at: addMonths(new Date(), 60),
            status: SubscriptionStatus.active,
          });
        }

        await this.organizationService.createNewOrganiation(
          user,
          organizationName,
        );
        const accountActivationToken = this.jwtService.sign(
          { id: user.id },
          { expiresIn: process.env.ACTIVATION_EMAIL_LIFE },
        );
        const activationURL = `${process.env.ORIGIN}/user/welcome/${accountActivationToken}`;
        sendEmail({
          emailType: 'account_activation',
          email,
          messageBody: { firstName, lastName, activationURL },
        });

        return {
          data: { ...user, password: '' },
          error: null,
          success: true,
        };
      }
      return {
        data: null,
        error: [
          {
            field: 'server',
            message: 'Internal Server Error',
          },
        ],
        success: false,
      };
    } catch (err) {
      saveLogs(this.logger, 'at creating new organization user', err);
      return {
        data: null,
        error: [
          {
            field: 'server',
            message: 'Internal Server Error',
          },
        ],
        success: false,
      };
    }
  }

  async updateUserFromProfile(
    id: string,
    firstName: string,
    lastName: string,
    identityNumber,
  ) {
    try {
      const currentUser: User = await this.userRepository.findOne(id);
      currentUser.firstName = firstName;
      currentUser.lastName = lastName;
      currentUser.identityNumber = identityNumber;
      await this.userRepository.save(currentUser);
    } catch (err) {
      saveLogs(
        this.logger,
        'at updating user info from profile update',
        err,
        id,
      );
    }
  }

  async checkEmailExist(email): Promise<CheckField> {
    try {
      if (await this.userRepository.findOne({ email })) {
        return {
          success: true,
          error: [
            {
              field: 'email',
              message: 'Email already exists.',
            },
          ],
        };
      }
      return {
        success: false,
        error: null,
      };
    } catch (err) {
      saveLogs(this.logger, 'at checking if email exist', err);
      return {
        success: false,
        error: null,
      };
    }
  }

  async findUserByUserEmail(email: string): Promise<User> {
    try {
      return this.userRepository.findOne({ email: email.toLowerCase() });
    } catch (err) {
      saveLogs(this.logger, 'finding user by email addreess', err, email);
    }
  }

  async findUserByUserId(id: string): Promise<User> {
    try {
      return this.userRepository.findOne({ id: id });
    } catch (err) {
      saveLogs(this.logger, 'finding user by userId', err, id);
    }
  }

  async findOrganization(userId: string): Promise<User> {
    try {
      return this.userRepository.findOne({
        where: { id: userId },
        relations: ['organization'],
      });
    } catch (err) {
      saveLogs(this.logger, 'at finding user organization', err, userId);
    }
  }

  async resetPassword(id: string, plainPassword: string): Promise<any> {
    const passwordSchema = Yup.object().shape({
      plainPassword: Yup.string()
        .min(8, 'Password is too short - shoule be atleast 8 char minimum.')
        .max(50, 'Password too long.')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'"<>.^*()$[\]{}\_\/\\~%!`-])[A-Za-z\d$&+,:;=?@#|'"<>.^*()$[\]\\{}\_\/~%!`-]{8,50}$/,
          'Password must have one uppercase letter, one lowercase letter, one number and one special character.',
        )
        .required('Password is required'),
    });
    try {
      await passwordSchema.validate({ plainPassword }, { abortEarly: false });
      const user = await this.userRepository.findOne({ id: id });
      const hashedPassword = await argon2.hash(plainPassword);
      user.password = hashedPassword;
      await this.userRepository.save(user);
      return {
        success: true,
        error: null,
      };
    } catch (err) {
      saveLogs(this.logger, 'at reseting user password', err, id);
      return {
        success: false,
        error: {
          field: 'newPassword',
          message:
            'Password must have one uppercase letter, one lowercase letter, one number and one special character',
        },
      };
    }
  }

  async verifyActivationToken(token: string) {
    try {
      this.jwtService.verify(token, { ignoreExpiration: false });
      const decodedJWT = await this.jwtService.decode(token, {
        complete: true,
      });
      const userId: string = decodedJWT['payload'].id;
      return this.activateAccount(userId);
    } catch (err) {
      console.log(err);
      saveLogs(this.logger, 'at verifiying activation token of user', err);
      return { success: false };
    }
  }

  async activateAccount(userId: string) {
    try {
      const user: User = await this.userRepository.findOne({ id: userId });
      if (user.accountActivated) {
        return { success: true, activated: true };
      } else {
        user.accountActivated = true;
        await this.userRepository.save(user);
        const payload = { id: user.id };
        return {
          success: true,
          access_token: this.jwtService.sign(payload, {
            // secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: process.env.JWT_ACCESS_LIFE,
          }),
          refresh_token: this.jwtService.sign(payload, {
            // secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_LIFE,
          }),
        };
      }
    } catch (err) {
      console.log(err);
      saveLogs(this.logger, 'at activating user account', err, userId);
      return {
        success: 'false',
      };
    }
  }

  async resendActivationEmail(email: string) {
    try {
      const user: User = await this.userRepository.findOne({ email: email });
      if (user && !user.accountActivated) {
        const { firstName, lastName } = user;
        const accountActivationToken = this.jwtService.sign(
          { id: user.id },
          { expiresIn: process.env.ACTIVATION_EMAIL_LIFE },
        );
        const activationURL = `${process.env.ORIGIN}/user/welcome/${accountActivationToken}`;
        sendEmail({
          emailType: 'account_activation',
          email,
          messageBody: { firstName, lastName, activationURL },
        });
        return {
          success: true,
        };
      }
      return { success: true };
    } catch (err) {
      saveLogs(this.logger, 'at resending the activation email', err, email);
    }
  }

  async findUserType(userId: string) {
    try {
      const user = await this.userRepository.findOne({ id: userId });
      return { userType: user.userType };
    } catch (err) {
      saveLogs(this.logger, 'at finding user type', err, userId);
    }
  }

  // Saving the time when user logs out from the system
  async storeLogoutTime(userId: string) {
    try {
      const user = await this.userRepository.findOne({ id: userId });
      user.lastLoggedIn = new Date();
      if (await this.userRepository.save(user)) {
        return {
          success: true,
        };
      }
      return { success: false };
    } catch (err) {
      saveLogs(this.logger, 'at saving user logout time', err, userId);
    }
  }
}

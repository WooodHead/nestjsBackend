import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as AWS from 'aws-sdk';
import { UserService } from '../user/user.service';
import { getRepository, Repository, TreeLevelColumn } from 'typeorm';
import { MessageRoom } from './entities/messageRoom.entity';
import { userTypeEnum } from 'src/user/type/userType';
import { SocketGateway } from '../websocket/websocket.gateway';
import { ProfileService } from 'src/profile/profile.service';
import { Profile } from '../profile/entities/profile.entity';
import { v4 as uuid } from 'uuid';
AWS.config.update({
  region: 'us-east-2',
  accessKeyId: 'AKIAU7XV2U62IYZ55CG5',
  secretAccessKey: '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',
});

const docClient = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
});

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageRoom)
    private messageRoomRepository: Repository<MessageRoom>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private userService: UserService,
  ) {}
  async saveMessage(body: any) {
    try {
      let params = {
        TableName: 'SakchhaMessage',
        Item: {
          id: { S: uuid() },
          message: {
            S: body.message,
          },
          roomId: {
            S: body.roomId,
          },
          senderId: { S: body.senderId },
          date: { N: body.date },
        },
      };
      docClient.putItem(params, (err, data) => {
        if (err) {
          throw new Error('Message not saved');
        } else {
          return { success: true, status: 'saved' };
        }
      });
    } catch (err) {
      throw new BadRequestException({ message: err.message });
    }
  }
  async findRoom(roomId: string) {
    try {
      const room = await this.messageRoomRepository.findOne({
        where: [{ roomId: roomId }],
        relations: ['buyer', 'provider'],
      });
      if (!room) {
        return {
          success: false,
          message: 'No such room found',
        };
      }
      return {
        success: true,
        room,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
  async joinRoom(buyerId: string, providerId: string) {
    try {
      const oldRoom = await this.messageRoomRepository.findOne({
        where: [{ buyer: buyerId, provider: providerId }],
      });
      if (oldRoom) {
        return { success: true, roomId: oldRoom.roomId };
      }
      const buyerUser = await this.userService.findUserByUserId(buyerId);
      const providerUser = await this.userService.findUserByUserId(providerId);
      const newRoom = await this.messageRoomRepository.save({
        buyer: buyerUser,
        provider: providerUser,
      });
      return {
        success: true,
        roomId: newRoom.roomId,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Can not establish a connection',
      };
    }
  }

  async findUserRooms(userId: string) {
    try {
      const queryCondition = {};
      const user = await this.userService.findUserByUserId(userId);
      if (user.userType === userTypeEnum.Buyer) {
        queryCondition['buyer'] = userId;
      }
      if (user.userType === userTypeEnum.Provider) {
        queryCondition['provider'] = userId;
      }
      const userRooms = await this.messageRoomRepository.find({
        where: [queryCondition],
      });
      return {
        success: true,
        rooms: userRooms,
      };
    } catch (err) {
      return {
        success: false,
        rooms: [],
      };
    }
  }

  async allChats(userId: string) {
    try {
      const roomQuery = getRepository(MessageRoom).createQueryBuilder(
        'messageRoom',
      );
      const user = await this.userService.findUserByUserId(userId);
      // const profile = await this.profileService.getProfileByUserId(userId);
      if (user.userType === userTypeEnum.Buyer) {
        roomQuery
          .leftJoinAndSelect('messageRoom.provider', 'provider')
          .where('messageRoom.buyerId=:buyerId', { buyerId: userId })
          .select(['messageRoom.roomId', 'provider']);
      } else {
        roomQuery
          .leftJoinAndSelect('messageRoom.buyer', 'buyer')
          .where('messageRoom.providerId=:providerId', { providerId: userId })
          .select(['messageRoom.roomId', 'buyer']);
      }
      const result = await roomQuery.getMany();
      const allRooms = Promise.all(
        result.map(async (r) => {
          const { messages } = await this.roomMessageQuery(r.roomId);
          const lastMessage = messages[0] ? messages[0] : {};
          const userId = r.buyer ? r.buyer.id : r.provider.id;
          const profile = await getRepository(Profile)
            .createQueryBuilder('profile')
            .where('profile.userId =:userId', { userId: userId })
            .getOne();
          return {
            roomId: r.roomId,
            name: r.buyer
              ? `${r.buyer.firstName} ${r.buyer.lastName}`
              : `${r.provider.firstName} ${r.provider.lastName}`,
            avatar: profile.avatar,
            message: lastMessage,
          };
        }),
      );
      return allRooms
        .then((data) => {
          return {
            success: true,
            rooms: data,
          };
        })
        .catch((err) => {
          console.log(err);
          throw new Error(err);
        });
    } catch (err) {
      console.log(err);
      return {
        success: false,
      };
    }
  }

  async roomMessageQuery(roomId: string) {
    try {
      let params = {
        TableName: 'SakchhaMessage',
        IndexName: 'RoomIdIndex',
        KeyConditionExpression: 'roomId = :rid',
        ExpressionAttributeValues: {
          ':rid': { S: roomId },
        },
        ScanIndexForward: false,
        Limit: 20,
      };
      const result = await docClient.query(params).promise();
      const lastEvaluatedKey = result.LastEvaluatedKey
        ? result.LastEvaluatedKey
        : null;
      const messages = result.Items.map((r) => {
        return {
          roomId: r.roomId.S,
          message: r.message.S,
          date: r.date.N,
          id: r.id.S,
          senderId: r.senderId.S,
        };
      });
      return { messages, lastEvaluatedKey };
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async findRoomMessage(userId: string, roomId: string) {
    try {
      const roomInfo = await this.findRoom(roomId);
      const counterPartId =
        roomInfo.room.buyer.id === userId
          ? roomInfo.room.provider.id
          : roomInfo.room.buyer.id;
      const counterPartUser = await this.userService.findUserByUserId(
        counterPartId,
      );
      const counterPartName = `${counterPartUser.firstName} ${counterPartUser.lastName}`;
      const counterPartProfile = await this.profileRepository.findOne({
        where: [{ user: counterPartId }],
      });
      const counterPartAvatar = counterPartProfile.avatar;
      const counterPartJobTitle = counterPartProfile.jobTitle;
      const messageResult = await this.roomMessageQuery(roomId);
      return {
        success: true,
        messages: messageResult.messages.reverse(),
        lastEvaluatedKey: messageResult.lastEvaluatedKey,
        receiver: {
          avatar: counterPartAvatar,
          jobTitle: counterPartJobTitle,
          name: counterPartName,
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
      };
    }
  }

  async findRoomMessagePagination(roomId: string, lastEvaluatedKey: any) {
    try {
      let params = {
        TableName: 'SakchhaMessage',
        IndexName: 'RoomIdIndex',
        KeyConditionExpression: 'roomId = :rid',
        ExpressionAttributeValues: {
          ':rid': { S: roomId },
        },
        ScanIndexForward: false,
        Limit: 20,
        ExclusiveStartKey: lastEvaluatedKey,
      };
      const result = await docClient.query(params).promise();
      const newEvaluatedKey = result.LastEvaluatedKey
        ? result.LastEvaluatedKey
        : null;
      const messages = result.Items.map((r) => {
        return {
          roomId: r.roomId.S,
          message: r.message.S,
          date: r.date.N,
          id: r.id.S,
          senderId: r.senderId.S,
        };
      });
      return {
        success: true,
        messages: messages.reverse(),
        lastEvaluatedKey: newEvaluatedKey,
      };
    } catch (err) {
      console.log(err);
      return { success: false };
    }
  }
}

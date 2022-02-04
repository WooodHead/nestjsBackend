import { SKILL_PROFICIENCY_TYPE } from '../../lead/types/skillProficiency';

class User_Skill {
  category: string;
  subCategory: string;
  proficiency: {
    name: SKILL_PROFICIENCY_TYPE;
  };
}

export class UserSkillDto {
  skills: User_Skill[];
}

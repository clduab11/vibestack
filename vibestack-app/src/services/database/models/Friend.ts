import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, action, json } from '@nozbe/watermelondb/decorators';

const sanitizeProfileData = (raw: any) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw || {};
};

export default class Friend extends Model {
  static table = 'friends';

  @field('server_id') serverId!: string | null;
  @field('user_id') userId!: string;
  @json('profile_data', sanitizeProfileData) profileData!: {
    name: string;
    avatar: string;
    bio?: string;
  };
  @field('friendship_status') friendshipStatus!: string;
  @date('connected_at') connectedAt!: Date;
  @field('sync_status') syncStatus!: string;
  
  get isAccepted(): boolean {
    return this.friendshipStatus === 'accepted';
  }
  
  get isPending(): boolean {
    return this.friendshipStatus === 'pending';
  }
  
  @action async accept() {
    await this.update(friend => {
      friend.friendshipStatus = 'accepted';
      friend.syncStatus = 'pending';
    });
  }
  
  @action async updateProfile(profileData: any) {
    await this.update(friend => {
      friend.profileData = profileData;
    });
  }
}
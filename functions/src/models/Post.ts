export interface Post {
  user_id: String;
  userProfileImage: String;
  username: String;
  image: Array<String>;
  imageName: Array<String>;
  likers: Array<String>;
  likesCount: Number;
  description: String;
  Timestamp;
}

// comment : [{
//         userId:String,
//         userName:String,
//         commentId : String,
//         text: String ,
//         Timestamp:Date}]

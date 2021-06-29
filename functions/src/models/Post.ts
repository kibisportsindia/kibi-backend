export interface Post { 
        user_id :  String ,
        imageUrl : String,
        comment : [{ 
        commentId : String,
        text: String ,
        Timestamp}],
        likers :Array<String>,
        likesCount : Number,
        description: String,
        Timestamp
}
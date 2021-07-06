export interface Post { 
        user_id :  String ,
        imageUrl : Array<String>,
        comment : [{ 
        commentId : String,
        text: String ,
        Timestamp:Date}],
        likers :Array<String>,
        likesCount : Number,
        description: String,
        Timestamp
}
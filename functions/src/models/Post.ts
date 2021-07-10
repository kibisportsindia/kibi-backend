export interface Post { 
        user_id :  String ,
        imageUrl : Array<String>,
        comment : Array<Object>,
        likers :Array<String>,
        likesCount : Number,
        description: String,
        Timestamp
}

// comment : [{
//         userId:String,
//         userName:String,        
//         commentId : String,
//         text: String ,
//         Timestamp:Date}]
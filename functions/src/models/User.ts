export interface User {
  invite_code: String;
  phone: String;
  name: String;
  age: Number;
  location: String;
  role: Role;
  gender: Gender;
  invited_by;
  connections: Array<String>;
  imageUrl: String;
  status1:String;
  status2:String;
}

enum Role {
  General = "General",
  Athlete = "Athlete",
  Coach = "Coach",
  Sports_Academy = "Sports Academy",
  Brand_Company = "Brand/Company",
  Sports_Staff = "Sports Staff",
}

enum Gender {
  Male = "Male",
  Female = "Female",
}

// export interface Phone {
//   phone: String;
// }

export interface Social {
  social_links: Array<String>;
}

export interface Interests {
  interests: Array<String>;
}

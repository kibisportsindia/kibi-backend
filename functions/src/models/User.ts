export interface User {
  name: String;
  age: Number;
  location: String;
  role: Array<Role>;
  invite_code: String;
  gender: Array<Gender>;
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

export interface Phone {
  phone: String;
}

export interface Social {
  social_links: Array<String>;
}

export interface Interests {
  interests: Array<String>;
}

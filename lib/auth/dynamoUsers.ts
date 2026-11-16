/**
 * Imported DynamoDB demo user extract (dynamouser.csv, repo root).
 *
 * Only the attributes actually needed downstream are kept:
 *   - Identity (used by the local mock IDP, lib/auth/mockIdp.ts):
 *       userId, email, firstName, lastName
 *   - Entitlement seed data (used by lib/crm/mockData.ts to build a
 *     CrmUser per record — role/persona/tool-access derived from these):
 *       userRole, userType, isSuperUser, sbg, honeywellId, contactId
 *
 * Not imported: _id (duplicate of userId), country, created_date,
 * default_language, internalUser, phone, status — not required for auth
 * or the demo entitlement model.
 */

export interface DynamoUserRecord {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  honeywellId: string;
  contactId: string;
  userRole: string;
  userType: "Employee" | "Channel Partner";
  isSuperUser: boolean;
  sbg: string;
}

export const DYNAMO_USERS: DynamoUserRecord[] = [
  {
    userId: "d9e2fb468ee32974",
    email: "hannacasey@example.com",
    firstName: "Christopher",
    lastName: "Roy",
    honeywellId: "d9e2fb468ee32974",
    contactId: "0031HR13S71Q4B7IZ0",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: true,
    sbg: "PMT"
  },
  {
    userId: "4457d894fec3088f",
    email: "tbrooks@example.net",
    firstName: "George",
    lastName: "Adams",
    honeywellId: "4457d894fec3088f",
    contactId: "003VxNSMYTYAN2K04Z",
    userRole: "Buyer",
    userType: "Channel Partner",
    isSuperUser: true,
    sbg: "BMS"
  },
  {
    userId: "96cffc8c68d06ff6",
    email: "nhoffman@example.org",
    firstName: "Tracy",
    lastName: "Barrett",
    honeywellId: "96cffc8c68d06ff6",
    contactId: "003dqV52X69R489C67",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: true,
    sbg: "Industrial Automation"
  },
  {
    userId: "4c68fd58ee3ddd99",
    email: "nparsons@example.org",
    firstName: "Tracy",
    lastName: "Jones",
    honeywellId: "4c68fd58ee3ddd99",
    contactId: "003VxD848534IIR4X5",
    userRole: "Buyer",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "HBS"
  },
  {
    userId: "51fd76c3a0f7b8c9",
    email: "jesse86@example.net",
    firstName: "Wendy",
    lastName: "Stephens",
    honeywellId: "51fd76c3a0f7b8c9",
    contactId: "003KWGOJYL814ASJU3",
    userRole: "Admin",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "PMT"
  },
  {
    userId: "b070a4d4076c06fb",
    email: "chelsea70@example.org",
    firstName: "Bogdan",
    lastName: "Marinescu",
    honeywellId: "b070a4d4076c06fb",
    contactId: "003VxAB36G0LCX671F",
    userRole: "Technician",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "BMS"
  },
  {
    userId: "40281351408d65fe",
    email: "georgeelizabeth@example.com",
    firstName: "Frank",
    lastName: "Macias",
    honeywellId: "40281351408d65fe",
    contactId: "0035aP4XN80OV0CWP5",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: false,
    sbg: "BMS"
  },
  {
    userId: "5a21366e8ce93246",
    email: "jason88@example.org",
    firstName: "Zachary",
    lastName: "Cabrera",
    honeywellId: "5a21366e8ce93246",
    contactId: "003KW1MAY2E6HOGDHC",
    userRole: "Technician",
    userType: "Channel Partner",
    isSuperUser: true,
    sbg: "Security"
  },
  {
    userId: "c3f4e7a4555c2f71",
    email: "christina97@example.net",
    firstName: "Tracey",
    lastName: "Evans",
    honeywellId: "c3f4e7a4555c2f71",
    contactId: "0035aS9N00BMZE2WZY",
    userRole: "Buyer",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Trend"
  },
  {
    userId: "b4ef77459a8b3789",
    email: "ashley06@example.org",
    firstName: "Jose",
    lastName: "Morris",
    honeywellId: "b4ef77459a8b3789",
    contactId: "003dq6ZYECT19F9F6X",
    userRole: "Approver",
    userType: "Employee",
    isSuperUser: false,
    sbg: "PMT"
  },
  {
    userId: "5c9eb38075539592",
    email: "owhitaker@example.org",
    firstName: "Richard",
    lastName: "Smith",
    honeywellId: "5c9eb38075539592",
    contactId: "0035a9ULBPH6Z1QUN9",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Security"
  },
  {
    userId: "8649b43e03271c2e",
    email: "sophia92@example.net",
    firstName: "Evan",
    lastName: "Gregory",
    honeywellId: "8649b43e03271c2e",
    contactId: "0031H1N6W5W5SH4TA2",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: false,
    sbg: "HBT"
  },
  {
    userId: "7cd2a053b1d8b813",
    email: "olsonevan@example.org",
    firstName: "Jeffrey",
    lastName: "Fowler",
    honeywellId: "7cd2a053b1d8b813",
    contactId: "003dqH9RASOR8RYCGO",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "UOP"
  },
  {
    userId: "7644441c652316ce",
    email: "emilychavez@example.com",
    firstName: "Charles",
    lastName: "Sloan",
    honeywellId: "7644441c652316ce",
    contactId: "003dqA4TOE9A0O1BQM",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: false,
    sbg: "HBS"
  },
  {
    userId: "721c7fe972a1f99a",
    email: "halljoseph@example.com",
    firstName: "Mariah",
    lastName: "Snyder",
    honeywellId: "721c7fe972a1f99a",
    contactId: "003VxNLRYFC4LG4QNV",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Fire"
  },
  {
    userId: "7112a35218326d22",
    email: "gregorypennington@example.net",
    firstName: "Samantha",
    lastName: "Brown",
    honeywellId: "7112a35218326d22",
    contactId: "003VxMD8A54AEYSDBI",
    userRole: "Technician",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "HBS"
  },
  {
    userId: "9c6091d61a2b8007",
    email: "nicoledecker@example.com",
    firstName: "Daniel",
    lastName: "Hardin",
    honeywellId: "9c6091d61a2b8007",
    contactId: "003VxTDU058YXY9S4T",
    userRole: "Buyer",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "PMT"
  },
  {
    userId: "63390318cb629500",
    email: "stephen54@example.com",
    firstName: "Michael",
    lastName: "Daniel",
    honeywellId: "63390318cb629500",
    contactId: "003VxVGMJQIYJCHSN2",
    userRole: "Technical Support Only",
    userType: "Employee",
    isSuperUser: false,
    sbg: "HBT"
  },
  {
    userId: "0e3aa93d4c815619",
    email: "danny84@example.org",
    firstName: "Karla",
    lastName: "Barber",
    honeywellId: "0e3aa93d4c815619",
    contactId: "003KW141QQ2L636A8P",
    userRole: "Admin",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "BMS"
  },
  {
    userId: "5166c46a00e98824",
    email: "john90@example.org",
    firstName: "Connie",
    lastName: "Love",
    honeywellId: "5166c46a00e98824",
    contactId: "003VxW0B42VPKWU8JG",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Industrial Automation"
  },
  {
    userId: "bb5ff476bd111258",
    email: "austinpace@example.net",
    firstName: "John",
    lastName: "Hansen",
    honeywellId: "bb5ff476bd111258",
    contactId: "003VxBV7YHP25LC9ZB",
    userRole: "Admin",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Industrial Automation"
  },
  {
    userId: "a0a224ac74d913aa",
    email: "rossjoseph@example.com",
    firstName: "Jennifer",
    lastName: "Bonilla",
    honeywellId: "a0a224ac74d913aa",
    contactId: "003dqJEEUWELLN1F7H",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: false,
    sbg: "PMT"
  },
  {
    userId: "2360027914a50093",
    email: "lorivilla@example.org",
    firstName: "Jorge",
    lastName: "Johnson",
    honeywellId: "2360027914a50093",
    contactId: "003dqST6FOVEI6PJ73",
    userRole: "Admin",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "BMS"
  },
  {
    userId: "3d360e0597ba8af9",
    email: "longangela@example.org",
    firstName: "Tyler",
    lastName: "Pham",
    honeywellId: "3d360e0597ba8af9",
    contactId: "0031H6O6JNNJ31FAOF",
    userRole: "Buyer",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Fire"
  },
  {
    userId: "6352f5150316733f",
    email: "brownjames@example.org",
    firstName: "Anthony",
    lastName: "Hunter",
    honeywellId: "6352f5150316733f",
    contactId: "003dqOKJM463CYM85U",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "HBT"
  },
  {
    userId: "8d4797d7874f9b79",
    email: "randallcole@example.net",
    firstName: "Harriet",
    lastName: "Okonkwo",
    honeywellId: "8d4797d7874f9b79",
    contactId: "003Vx32WOZ7DBU68LY",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Trend"
  },
  {
    userId: "b512be50ce469345",
    email: "brenda72@example.com",
    firstName: "Gerald",
    lastName: "Gonzales",
    honeywellId: "b512be50ce469345",
    contactId: "003dqDQOZCV3EXZN4Z",
    userRole: "Technician",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Trend"
  },
  {
    userId: "848f93d4bf78cebc",
    email: "gonzalezcarol@example.net",
    firstName: "Jacob",
    lastName: "Adams",
    honeywellId: "848f93d4bf78cebc",
    contactId: "003dq53BCQXHXVW2E0",
    userRole: "Technician",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Fire"
  },
  {
    userId: "938109927e5cfd55",
    email: "jharmon@example.net",
    firstName: "Yvonne",
    lastName: "Rowe",
    honeywellId: "938109927e5cfd55",
    contactId: "0031HIPO10T2CFXEZH",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: false,
    sbg: "PMT"
  },
  {
    userId: "01655cb99a57d53b",
    email: "shannonstephens@example.net",
    firstName: "Francisco",
    lastName: "Walker",
    honeywellId: "01655cb99a57d53b",
    contactId: "003VxNBUBP82SZGOAC",
    userRole: "Approver",
    userType: "Employee",
    isSuperUser: true,
    sbg: "Industrial Automation"
  },
  {
    userId: "0b8dd0f68af8229d",
    email: "larsonana@example.com",
    firstName: "April",
    lastName: "Browning",
    honeywellId: "0b8dd0f68af8229d",
    contactId: "0031HP1LVC5YV4R0YT",
    userRole: "Admin",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "UOP"
  },
  {
    userId: "65af7af18b390239",
    email: "jeffreyjones@example.net",
    firstName: "Hailey",
    lastName: "Robinson",
    honeywellId: "65af7af18b390239",
    contactId: "003dqIQ3NJ4OFG9X7Q",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "BMS"
  },
  {
    userId: "937b64fc5f6a97d9",
    email: "bridgetmueller@example.org",
    firstName: "Brett",
    lastName: "Torres",
    honeywellId: "937b64fc5f6a97d9",
    contactId: "003KWK79I3EDGLWUQQ",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "HBS"
  },
  {
    userId: "h011803",
    email: "madeline67@example.com",
    firstName: "Marcus",
    lastName: "Owusu",
    honeywellId: "h011803",
    contactId: "003QUK413YFLJ4OKQG",
    userRole: "Technical Support Only",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Industrial Automation"
  },
  {
    userId: "93476781648462e5",
    email: "rhondataylor@example.com",
    firstName: "Ruth",
    lastName: "Rodriguez",
    honeywellId: "93476781648462e5",
    contactId: "003KWQG5GE0EOUPCD7",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Security"
  },
  {
    userId: "fdb58f781bf204a3",
    email: "michael77@example.org",
    firstName: "Hannah",
    lastName: "Allen",
    honeywellId: "fdb58f781bf204a3",
    contactId: "0031HEUYBQ8QSA1UO6",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Security"
  },
  {
    userId: "ce0310446afd6f1a",
    email: "ashley14@example.com",
    firstName: "James",
    lastName: "Wood",
    honeywellId: "ce0310446afd6f1a",
    contactId: "0035aMMAQ4X3GPYIKE",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Industrial Automation"
  },
  {
    userId: "3332e17bda470e6e",
    email: "terrylori@example.net",
    firstName: "Kathleen",
    lastName: "Garcia",
    honeywellId: "3332e17bda470e6e",
    contactId: "003dqF77IR18K50Z8M",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Industrial Automation"
  },
  {
    userId: "3e0ac12bc55d6583",
    email: "chasejohnson@example.net",
    firstName: "Ashley",
    lastName: "Walters",
    honeywellId: "3e0ac12bc55d6583",
    contactId: "003dqMAADIYK1TICT4",
    userRole: "Buyer",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Fire"
  },
  {
    userId: "8ba7c7f3bf77d0b6",
    email: "patriciajimenez@example.com",
    firstName: "Sara",
    lastName: "Griffin",
    honeywellId: "8ba7c7f3bf77d0b6",
    contactId: "0031HUCYV20X8JPTE8",
    userRole: "Technician",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "PMT"
  },
  {
    userId: "1ab4184abccf33a1",
    email: "carrierichmond@example.net",
    firstName: "Kathryn",
    lastName: "Miller",
    honeywellId: "1ab4184abccf33a1",
    contactId: "003dqHHNGM2VJQ4GYB",
    userRole: "Approver",
    userType: "Employee",
    isSuperUser: false,
    sbg: "UOP"
  },
  {
    userId: "a882f3312263c85f",
    email: "teresa91@example.org",
    firstName: "Courtney",
    lastName: "Contreras",
    honeywellId: "a882f3312263c85f",
    contactId: "0035aQAGBP6700WLS8",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "HBT"
  },
  {
    userId: "h269744",
    email: "hilllaura@example.org",
    firstName: "Priya",
    lastName: "Narayan",
    honeywellId: "h269744",
    contactId: "0035aGREMO73XAGNIV",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: true,
    sbg: "HBT"
  },
  {
    userId: "8dee94a7d36d7ee4",
    email: "figueroathomas@example.net",
    firstName: "Dylan",
    lastName: "Brown",
    honeywellId: "8dee94a7d36d7ee4",
    contactId: "003KWVU5X443X4LBVR",
    userRole: "Technician",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "BMS"
  },
  {
    userId: "e71ceb9b9b685fb8",
    email: "pcampos@example.com",
    firstName: "Sara",
    lastName: "Hudson",
    honeywellId: "e71ceb9b9b685fb8",
    contactId: "0035aZ55PZYGOSP53N",
    userRole: "Admin",
    userType: "Employee",
    isSuperUser: false,
    sbg: "Security"
  },
  {
    userId: "0af7ea11132c355d",
    email: "klee@example.com",
    firstName: "Alison",
    lastName: "Boyd",
    honeywellId: "0af7ea11132c355d",
    contactId: "003KW3MRR62KBEZV8D",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "HBT"
  },
  {
    userId: "01c9a044f4f3a71a",
    email: "johnvelazquez@example.org",
    firstName: "Mary",
    lastName: "Henderson",
    honeywellId: "01c9a044f4f3a71a",
    contactId: "003dq2LX4EHR75R59D",
    userRole: "Admin",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Fire"
  },
  {
    userId: "79da869849dbecfa",
    email: "geraldfloyd@example.net",
    firstName: "Donna",
    lastName: "Hopkins",
    honeywellId: "79da869849dbecfa",
    contactId: "003VxVYS04WWWTGOBW",
    userRole: "Buyer",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "BMS"
  },
  {
    userId: "fc5edfe78653fb78",
    email: "kevin94@example.net",
    firstName: "Jennifer",
    lastName: "Hernandez",
    honeywellId: "fc5edfe78653fb78",
    contactId: "003dqXJGNPNIPYTNAH",
    userRole: "Admin",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Industrial Automation"
  },
  {
    userId: "e59d32aaa392a4e7",
    email: "nestrada@example.org",
    firstName: "Marcus",
    lastName: "Whitfield",
    honeywellId: "e59d32aaa392a4e7",
    contactId: "003KWK1Q0VIGLKC9LI",
    userRole: "Purchasing",
    userType: "Channel Partner",
    isSuperUser: false,
    sbg: "Security"
  }
];

const DYNAMO_USER_IDS = new Set(DYNAMO_USERS.map((u) => u.userId));

/** True if `userId` belongs to the 50 local-mock-IDP users (entitlements resolved from DynamoDB). */
export function isDynamoIdpUser(userId: string): boolean {
  return DYNAMO_USER_IDS.has(userId);
}

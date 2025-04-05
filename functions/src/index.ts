import * as admin from "firebase-admin";

admin.initializeApp();

export { syncAuthorName } from "./syncAuthorName";
export { syncBooksInfo } from "./syncBooksInfo";

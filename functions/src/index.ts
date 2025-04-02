import * as admin from "firebase-admin";

admin.initializeApp();

export { calculateAvgRating } from "./calculateAvgRating";
export { syncAuthorName } from "./syncAuthorName";
export { syncBooksInfo } from "./syncBooksInfo";

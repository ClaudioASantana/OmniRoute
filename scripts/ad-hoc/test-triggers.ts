import { getDbInstance } from "../../src/lib/db/core";
const db = getDbInstance();
const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger'").all();
console.log(triggers);

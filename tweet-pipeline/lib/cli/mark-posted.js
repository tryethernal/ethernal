#!/usr/bin/env node
import { getDb } from '../db.js';
const [id, tweetIdsJson] = process.argv.slice(2);
getDb().markTweetPosted(Number(id), JSON.parse(tweetIdsJson));

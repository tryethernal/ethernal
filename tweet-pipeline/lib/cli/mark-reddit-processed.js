#!/usr/bin/env node
import { getDb } from '../db.js';
const postIds = process.argv.slice(2);
if (postIds.length > 0) getDb().markRedditPostsProcessed(postIds);

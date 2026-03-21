#!/usr/bin/env node
import { getDb } from '../db.js';
const postId = process.argv[2];
if (!postId) process.exit(1);
process.exit(getDb().isRedditPostProcessed(postId) ? 0 : 1);

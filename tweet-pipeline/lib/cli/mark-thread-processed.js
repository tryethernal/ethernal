#!/usr/bin/env node
import { getDb } from '../db.js';
getDb().markThreadsProcessed(process.argv.slice(2));

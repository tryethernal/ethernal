#!/usr/bin/env node
import { getDb } from '../db.js';
process.exit(getDb().isThreadProcessed(process.argv[2]) ? 0 : 1);

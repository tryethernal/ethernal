#!/usr/bin/env node
import { getDb } from '../db.js';
process.exit(getDb().isPromoted(process.argv[2]) ? 0 : 1);

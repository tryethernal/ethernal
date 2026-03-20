#!/usr/bin/env node
import { getDb } from '../db.js';
getDb().markPromoted(process.argv[2]);

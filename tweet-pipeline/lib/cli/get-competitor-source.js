#!/usr/bin/env node
import { getDb } from '../db.js';
const source = getDb().getCompetitorSource();
if (source) console.log(JSON.stringify(source));
else process.exit(1);

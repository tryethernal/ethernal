#!/usr/bin/env node
import { getDb } from '../db.js';
const source = getDb().getNewsletterSource();
if (source) console.log(JSON.stringify(source));
else process.exit(1);

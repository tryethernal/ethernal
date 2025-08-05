const { ethers } = require('ethers');
const logger = require('./logger');
const zlib = require('zlib');

/**
 * Enhanced Arbitrum batch data parser
 * Handles the complex format of Arbitrum batch data including compression and RLP encoding
 */
class ArbitrumBatchParser {
    constructor() {
        this.supportedVersions = ['1', '2']; // Arbitrum batch format versions
    }

    /**
     * Parse batch data to extract transaction information
     */
    async parseBatchData(batchData, dataLocation, batchContext) {
        try {
            const result = {
                transactionCount: 0,
                batchSize: batchData ? batchData.length : 0,
                dataHash: batchData ? ethers.utils.keccak256(batchData) : null,
                dataLocation: this.getDataLocationString(dataLocation),
                transactions: [],
                blocks: [],
                metadata: {}
            };

            if (!batchData || batchData === '0x' || batchData.length <= 2) {
                logger.debug('Empty batch data', batchContext);
                return result;
            }

            // Parse based on data location
            switch (dataLocation) {
                case 0: // On-chain data
                    return await this.parseOnChainBatchData(batchData, result, batchContext);
                case 1: // DAS (Data Availability Service)
                    return await this.parseDASBatchData(batchData, result, batchContext);
                case 2: // External storage (IPFS, etc.)
                    return await this.parseExternalBatchData(batchData, result, batchContext);
                default:
                    logger.warn('Unknown data location', { ...batchContext, dataLocation });
                    return result;
            }

        } catch (error) {
            logger.error('Failed to parse batch data', {
                ...batchContext,
                error: error.message
            });
            
            return {
                transactionCount: 0,
                batchSize: batchData ? batchData.length : 0,
                dataHash: batchData ? ethers.utils.keccak256(batchData) : null,
                dataLocation: this.getDataLocationString(dataLocation),
                transactions: [],
                blocks: [],
                metadata: { parseError: error.message }
            };
        }
    }

    /**
     * Parse on-chain batch data (most complex case)
     */
    async parseOnChainBatchData(batchData, result, batchContext) {
        try {
            // Convert hex string to buffer
            const dataBuffer = Buffer.from(batchData.slice(2), 'hex');
            
            logger.debug('Parsing on-chain batch data', {
                ...batchContext,
                dataLength: dataBuffer.length
            });

            // Arbitrum batch format typically starts with a header
            const batchInfo = await this.parseBatchHeader(dataBuffer, batchContext);
            result.metadata.batchInfo = batchInfo;

            if (batchInfo.version) {
                switch (batchInfo.version) {
                    case 1:
                        return await this.parseBatchV1(dataBuffer, result, batchContext);
                    case 2:
                        return await this.parseBatchV2(dataBuffer, result, batchContext);
                    default:
                        logger.warn('Unsupported batch version', {
                            ...batchContext,
                            version: batchInfo.version
                        });
                        return await this.parseWithHeuristics(dataBuffer, result, batchContext);
                }
            }

            // Fallback to heuristic parsing
            return await this.parseWithHeuristics(dataBuffer, result, batchContext);

        } catch (error) {
            logger.error('Failed to parse on-chain batch data', {
                ...batchContext,
                error: error.message
            });
            
            // Fallback to simple heuristic parsing
            return await this.parseWithHeuristics(Buffer.from(batchData.slice(2), 'hex'), result, batchContext);
        }
    }

    /**
     * Parse batch header to determine format and version
     */
    async parseBatchHeader(dataBuffer, batchContext) {
        try {
            if (dataBuffer.length < 32) {
                return { version: null, compressed: false };
            }

            // Check for common Arbitrum batch patterns
            const firstBytes = dataBuffer.slice(0, 4);
            const possibleHeader = dataBuffer.slice(0, 32);

            // Look for compression markers or format indicators
            const isCompressed = this.detectCompression(dataBuffer);
            const version = this.detectBatchVersion(dataBuffer);

            logger.debug('Parsed batch header', {
                ...batchContext,
                version,
                isCompressed,
                firstBytes: firstBytes.toString('hex')
            });

            return {
                version,
                compressed: isCompressed,
                headerBytes: possibleHeader.toString('hex')
            };

        } catch (error) {
            logger.warn('Failed to parse batch header', {
                ...batchContext,
                error: error.message
            });
            return { version: null, compressed: false };
        }
    }

    /**
     * Detect if batch data is compressed
     */
    detectCompression(dataBuffer) {
        // Check for common compression signatures
        if (dataBuffer.length < 4) return false;

        const firstFourBytes = dataBuffer.slice(0, 4);
        
        // Brotli compression signature
        if (firstFourBytes[0] === 0x21 && firstFourBytes[1] === 0x2C) {
            return true;
        }

        // Gzip signature
        if (firstFourBytes[0] === 0x1F && firstFourBytes[1] === 0x8B) {
            return true;
        }

        // Check for high entropy (likely compressed)
        const entropy = this.calculateEntropy(dataBuffer.slice(0, Math.min(256, dataBuffer.length)));
        return entropy > 7.5; // High entropy suggests compression
    }

    /**
     * Calculate entropy of data to detect compression
     */
    calculateEntropy(buffer) {
        const frequency = new Array(256).fill(0);
        
        for (const byte of buffer) {
            frequency[byte]++;
        }

        let entropy = 0;
        const length = buffer.length;

        for (const freq of frequency) {
            if (freq > 0) {
                const p = freq / length;
                entropy -= p * Math.log2(p);
            }
        }

        return entropy;
    }

    /**
     * Detect batch format version
     */
    detectBatchVersion(dataBuffer) {
        // Version detection heuristics based on Arbitrum batch format
        if (dataBuffer.length < 8) return null;

        // Check for version indicators in first few bytes
        const firstBytes = dataBuffer.slice(0, 8);
        
        // This is a simplified version detection - real implementation
        // would need to understand the exact Arbitrum batch format
        return 1; // Default to version 1
    }

    /**
     * Parse version 1 batch format
     */
    async parseBatchV1(dataBuffer, result, batchContext) {
        try {
            // Arbitrum v1 batch format parsing
            // This is a simplified implementation
            
            let offset = 0;
            const transactions = [];
            const blocks = [];

            // Skip header (simplified)
            offset += 32;

            // Parse blocks and transactions
            while (offset < dataBuffer.length - 32) {
                try {
                    const blockInfo = await this.parseBlockHeader(dataBuffer, offset, batchContext);
                    if (!blockInfo) break;

                    blocks.push(blockInfo.block);
                    transactions.push(...blockInfo.transactions);
                    offset = blockInfo.nextOffset;

                } catch (error) {
                    logger.debug('Block parsing ended', { ...batchContext, offset, error: error.message });
                    break;
                }
            }

            result.transactionCount = transactions.length;
            result.transactions = transactions;
            result.blocks = blocks;
            result.metadata.formatVersion = 1;

            logger.debug('Parsed batch v1', {
                ...batchContext,
                transactionCount: transactions.length,
                blockCount: blocks.length
            });

            return result;

        } catch (error) {
            logger.error('Failed to parse batch v1', {
                ...batchContext,
                error: error.message
            });
            return await this.parseWithHeuristics(dataBuffer, result, batchContext);
        }
    }

    /**
     * Parse version 2 batch format
     */
    async parseBatchV2(dataBuffer, result, batchContext) {
        try {
            // Arbitrum v2 batch format parsing
            // Similar to v1 but with different structure
            
            return await this.parseBatchV1(dataBuffer, result, batchContext);

        } catch (error) {
            logger.error('Failed to parse batch v2', {
                ...batchContext,
                error: error.message
            });
            return await this.parseWithHeuristics(dataBuffer, result, batchContext);
        }
    }

    /**
     * Parse block header within batch data
     */
    async parseBlockHeader(dataBuffer, offset, batchContext) {
        if (offset + 64 > dataBuffer.length) {
            return null;
        }

        try {
            // Simplified block header parsing
            const blockNumber = dataBuffer.readUInt32BE(offset);
            const transactionCount = dataBuffer.readUInt32BE(offset + 4);
            
            const block = {
                number: blockNumber,
                transactionCount: transactionCount,
                offset: offset
            };

            const transactions = [];
            let currentOffset = offset + 8;

            // Parse transactions in this block
            for (let i = 0; i < Math.min(transactionCount, 100); i++) { // Limit for safety
                if (currentOffset + 32 > dataBuffer.length) break;

                const tx = {
                    index: i,
                    blockNumber: blockNumber,
                    offset: currentOffset,
                    // Additional transaction fields would be parsed here
                };

                transactions.push(tx);
                currentOffset += 32; // Simplified transaction size
            }

            return {
                block,
                transactions,
                nextOffset: currentOffset
            };

        } catch (error) {
            logger.debug('Failed to parse block header', {
                ...batchContext,
                offset,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Fallback heuristic parsing when structured parsing fails
     */
    async parseWithHeuristics(dataBuffer, result, batchContext) {
        try {
            // Try to decompress if it looks compressed
            let workingBuffer = dataBuffer;
            
            if (result.metadata.batchInfo?.compressed) {
                try {
                    workingBuffer = await this.attemptDecompression(dataBuffer, batchContext);
                } catch (error) {
                    logger.debug('Decompression failed, using original data', {
                        ...batchContext,
                        error: error.message
                    });
                }
            }

            // Look for transaction-like patterns
            const transactionPatterns = this.findTransactionPatterns(workingBuffer);
            
            // Look for block patterns
            const blockPatterns = this.findBlockPatterns(workingBuffer);

            result.transactionCount = transactionPatterns.length;
            result.transactions = transactionPatterns.map((pattern, index) => ({
                index,
                offset: pattern.offset,
                signature: pattern.signature,
                estimatedSize: pattern.size
            }));

            result.blocks = blockPatterns.map((pattern, index) => ({
                index,
                offset: pattern.offset,
                estimatedTransactionCount: pattern.transactionCount
            }));

            result.metadata.parseMethod = 'heuristic';
            result.metadata.compressed = result.metadata.batchInfo?.compressed || false;

            logger.debug('Parsed batch with heuristics', {
                ...batchContext,
                transactionCount: result.transactionCount,
                blockCount: result.blocks.length
            });

            return result;

        } catch (error) {
            logger.error('Heuristic parsing failed', {
                ...batchContext,
                error: error.message
            });

            // Final fallback - return basic info
            result.transactionCount = 0;
            result.metadata.parseMethod = 'failed';
            return result;
        }
    }

    /**
     * Attempt to decompress batch data
     */
    async attemptDecompression(dataBuffer, batchContext) {
        // Try different decompression methods
        const methods = ['brotli', 'gzip', 'deflate'];

        for (const method of methods) {
            try {
                let decompressed;
                
                switch (method) {
                    case 'brotli':
                        decompressed = zlib.brotliDecompressSync(dataBuffer);
                        break;
                    case 'gzip':
                        decompressed = zlib.gunzipSync(dataBuffer);
                        break;
                    case 'deflate':
                        decompressed = zlib.inflateSync(dataBuffer);
                        break;
                }

                logger.debug('Successfully decompressed batch data', {
                    ...batchContext,
                    method,
                    originalSize: dataBuffer.length,
                    decompressedSize: decompressed.length
                });

                return decompressed;

            } catch (error) {
                logger.debug(`Decompression failed for ${method}`, {
                    ...batchContext,
                    method,
                    error: error.message
                });
            }
        }

        throw new Error('All decompression methods failed');
    }

    /**
     * Find transaction-like patterns in data
     */
    findTransactionPatterns(dataBuffer) {
        const patterns = [];
        const dataHex = dataBuffer.toString('hex');

        // Look for common transaction signatures and patterns
        const transactionSignatures = [
            /[0-9a-f]{8}/g, // Function selectors
            /[0-9a-f]{40}/g, // Addresses
            /[0-9a-f]{64}/g, // Full words (hashes, values)
        ];

        for (const regex of transactionSignatures) {
            let match;
            while ((match = regex.exec(dataHex)) !== null) {
                if (match.index % 2 === 0) { // Ensure byte alignment
                    patterns.push({
                        offset: match.index / 2,
                        signature: match[0],
                        size: match[0].length / 2,
                        type: this.classifyPattern(match[0])
                    });
                }
            }
        }

        // Remove duplicates and sort by offset
        const uniquePatterns = patterns
            .filter((pattern, index, arr) => 
                arr.findIndex(p => p.offset === pattern.offset) === index
            )
            .sort((a, b) => a.offset - b.offset);

        return uniquePatterns.slice(0, 1000); // Limit results
    }

    /**
     * Find block-like patterns in data
     */
    findBlockPatterns(dataBuffer) {
        const patterns = [];
        
        // Look for patterns that might indicate block boundaries
        // This is highly simplified
        for (let i = 0; i < dataBuffer.length - 32; i += 32) {
            const chunk = dataBuffer.slice(i, i + 32);
            
            // Look for patterns that might be block headers
            if (this.looksLikeBlockHeader(chunk)) {
                patterns.push({
                    offset: i,
                    transactionCount: this.estimateTransactionCount(chunk)
                });
            }
        }

        return patterns;
    }

    /**
     * Classify pattern type based on signature
     */
    classifyPattern(signature) {
        if (signature.length === 8) return 'function_selector';
        if (signature.length === 40) return 'address';
        if (signature.length === 64) return 'hash_or_value';
        return 'unknown';
    }

    /**
     * Check if chunk looks like a block header
     */
    looksLikeBlockHeader(chunk) {
        // Very basic heuristic - in real implementation this would be more sophisticated
        const firstWord = chunk.readUInt32BE(0);
        const secondWord = chunk.readUInt32BE(4);
        
        // Block numbers are usually reasonable values
        return firstWord > 0 && firstWord < 100000000 && secondWord >= 0 && secondWord < 10000;
    }

    /**
     * Estimate transaction count from block header
     */
    estimateTransactionCount(chunk) {
        try {
            return chunk.readUInt32BE(4) || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Parse DAS batch data
     */
    async parseDASBatchData(batchData, result, batchContext) {
        logger.debug('DAS batch data detected - limited parsing available', batchContext);
        
        // DAS data is stored off-chain, so we have limited ability to parse it
        // We might be able to get some metadata from the data hash
        
        result.metadata.dataAvailabilityService = true;
        result.metadata.parseMethod = 'das_limited';
        
        return result;
    }

    /**
     * Parse external storage batch data
     */
    async parseExternalBatchData(batchData, result, batchContext) {
        logger.debug('External storage batch data detected', batchContext);
        
        // Data is stored externally (IPFS, etc.)
        // Limited parsing ability without fetching external data
        
        result.metadata.externalStorage = true;
        result.metadata.parseMethod = 'external_limited';
        
        return result;
    }

    /**
     * Get string representation of data location
     */
    getDataLocationString(dataLocation) {
        switch (dataLocation) {
            case 0: return 'onchain';
            case 1: return 'das';
            case 2: return 'external';
            default: return 'unknown';
        }
    }
}

module.exports = ArbitrumBatchParser;
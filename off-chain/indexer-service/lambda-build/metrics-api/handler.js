"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const validation_1 = require("./helpers/validation");
const response_1 = require("./helpers/response");
const buys_1 = require("./handlers/buys");
const dequeues_1 = require("./handlers/dequeues");
/**
 * Lambda function to handle metrics API requests
 */
const handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Received event:', JSON.stringify(event, null, 2));
    try {
        const { httpMethod, resource, queryStringParameters } = event;
        // Validate date range parameters  
        const validatedRequest = (0, validation_1.validateDateRange)(queryStringParameters);
        if ((0, validation_1.isValidationError)(validatedRequest)) {
            return (0, response_1.createErrorResponse)(validatedRequest.statusCode, validatedRequest.code, validatedRequest.message);
        }
        // Route to appropriate handler based on resource path
        if (httpMethod === 'GET') {
            if (resource.endsWith('/metrics/buys')) {
                return yield (0, buys_1.handleBuysMetrics)(validatedRequest);
            }
            else if (resource.endsWith('/metrics/dequeues')) {
                return yield (0, dequeues_1.handleDequeuesMetrics)(validatedRequest);
            }
        }
        return (0, response_1.createErrorResponse)(404, 'NOT_FOUND', 'Endpoint not found');
    }
    catch (error) {
        console.error('Error processing request:', error);
        return (0, response_1.createErrorResponse)(500, 'INTERNAL_SERVER_ERROR', 'An internal error occurred');
    }
});
exports.handler = handler;

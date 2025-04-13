(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.GhostMeilisearchSearch = factory());
})(this, (function () { 'use strict';

    class MeiliSearchError extends Error {
        name = "MeiliSearchError";
        constructor(...params) {
            super(...params);
        }
    }

    class MeiliSearchApiError extends MeiliSearchError {
        name = "MeiliSearchApiError";
        cause;
        response;
        constructor(response, responseBody) {
            super(responseBody?.message ?? `${response.status}: ${response.statusText}`);
            this.response = response;
            if (responseBody !== undefined) {
                this.cause = responseBody;
            }
        }
    }

    class MeiliSearchRequestError extends MeiliSearchError {
        name = "MeiliSearchRequestError";
        constructor(url, cause) {
            super(`Request to ${url} has failed`, { cause });
        }
    }

    class MeiliSearchTimeOutError extends MeiliSearchError {
        name = "MeiliSearchTimeOutError";
        constructor(message) {
            super(message);
        }
    }

    function versionErrorHintMessage(message, method) {
        return `${message}\nHint: It might not be working because maybe you're not up to date with the Meilisearch version that ${method} call requires.`;
    }

    const PACKAGE_VERSION = "0.49.0";

    /** Removes undefined entries from object */
    function removeUndefinedFromObject(obj) {
        return Object.entries(obj).reduce((acc, curEntry) => {
            const [key, val] = curEntry;
            if (val !== undefined)
                acc[key] = val;
            return acc;
        }, {});
    }
    async function sleep(ms) {
        return await new Promise((resolve) => setTimeout(resolve, ms));
    }
    function addProtocolIfNotPresent(host) {
        if (!(host.startsWith("https://") || host.startsWith("http://"))) {
            return `http://${host}`;
        }
        return host;
    }
    function addTrailingSlash(url) {
        if (!url.endsWith("/")) {
            url += "/";
        }
        return url;
    }

    function toQueryParams(parameters) {
        const params = Object.keys(parameters);
        const queryParams = params.reduce((acc, key) => {
            const value = parameters[key];
            if (value === undefined) {
                return acc;
            }
            else if (Array.isArray(value)) {
                return { ...acc, [key]: value.join(",") };
            }
            else if (value instanceof Date) {
                return { ...acc, [key]: value.toISOString() };
            }
            return { ...acc, [key]: value };
        }, {});
        return queryParams;
    }
    function constructHostURL(host) {
        try {
            host = addProtocolIfNotPresent(host);
            host = addTrailingSlash(host);
            return host;
        }
        catch {
            throw new MeiliSearchError("The provided host is not valid.");
        }
    }
    function cloneAndParseHeaders(headers) {
        if (Array.isArray(headers)) {
            return headers.reduce((acc, headerPair) => {
                acc[headerPair[0]] = headerPair[1];
                return acc;
            }, {});
        }
        else if ("has" in headers) {
            const clonedHeaders = {};
            headers.forEach((value, key) => (clonedHeaders[key] = value));
            return clonedHeaders;
        }
        else {
            return Object.assign({}, headers);
        }
    }
    function createHeaders(config) {
        const agentHeader = "X-Meilisearch-Client";
        const packageAgent = `Meilisearch JavaScript (v${PACKAGE_VERSION})`;
        const contentType = "Content-Type";
        const authorization = "Authorization";
        const headers = cloneAndParseHeaders(config.requestConfig?.headers ?? {});
        // do not override if user provided the header
        if (config.apiKey && !headers[authorization]) {
            headers[authorization] = `Bearer ${config.apiKey}`;
        }
        if (!headers[contentType]) {
            headers["Content-Type"] = "application/json";
        }
        // Creates the custom user agent with information on the package used.
        if (config.clientAgents && Array.isArray(config.clientAgents)) {
            const clients = config.clientAgents.concat(packageAgent);
            headers[agentHeader] = clients.join(" ; ");
        }
        else if (config.clientAgents && !Array.isArray(config.clientAgents)) {
            // If the header is defined but not an array
            throw new MeiliSearchError(`Meilisearch: The header "${agentHeader}" should be an array of string(s).\n`);
        }
        else {
            headers[agentHeader] = packageAgent;
        }
        return headers;
    }
    class HttpRequests {
        headers;
        url;
        requestConfig;
        httpClient;
        requestTimeout;
        constructor(config) {
            this.headers = createHeaders(config);
            this.requestConfig = config.requestConfig;
            this.httpClient = config.httpClient;
            this.requestTimeout = config.timeout;
            try {
                const host = constructHostURL(config.host);
                this.url = new URL(host);
            }
            catch {
                throw new MeiliSearchError("The provided host is not valid.");
            }
        }
        async request({ method, url, params, body, config = {}, }) {
            const constructURL = new URL(url, this.url);
            if (params) {
                const queryParams = new URLSearchParams();
                Object.keys(params)
                    .filter((x) => params[x] !== null)
                    .map((x) => queryParams.set(x, params[x]));
                constructURL.search = queryParams.toString();
            }
            // in case a custom content-type is provided
            // do not stringify body
            if (!config.headers?.["Content-Type"]) {
                body = JSON.stringify(body);
            }
            const headers = { ...this.headers, ...config.headers };
            const responsePromise = this.fetchWithTimeout(constructURL.toString(), {
                ...config,
                ...this.requestConfig,
                method,
                body,
                headers,
            }, this.requestTimeout);
            const response = await responsePromise.catch((error) => {
                throw new MeiliSearchRequestError(constructURL.toString(), error);
            });
            // When using a custom HTTP client, the response is returned to allow the user to parse/handle it as they see fit
            if (this.httpClient !== undefined) {
                return response;
            }
            const responseBody = await response.text();
            const parsedResponse = responseBody === "" ? undefined : JSON.parse(responseBody);
            if (!response.ok) {
                throw new MeiliSearchApiError(response, parsedResponse);
            }
            return parsedResponse;
        }
        async fetchWithTimeout(url, options, timeout) {
            return new Promise((resolve, reject) => {
                const fetchFn = this.httpClient ? this.httpClient : fetch;
                const fetchPromise = fetchFn(url, options);
                const promises = [fetchPromise];
                // TimeoutPromise will not run if undefined or zero
                let timeoutId;
                if (timeout) {
                    const timeoutPromise = new Promise((_, reject) => {
                        timeoutId = setTimeout(() => {
                            reject(new Error("Error: Request Timed Out"));
                        }, timeout);
                    });
                    promises.push(timeoutPromise);
                }
                Promise.race(promises)
                    .then(resolve)
                    .catch(reject)
                    .finally(() => {
                    clearTimeout(timeoutId);
                });
            });
        }
        async get(url, params, config) {
            return await this.request({
                method: "GET",
                url,
                params,
                config,
            });
        }
        async post(url, data, params, config) {
            return await this.request({
                method: "POST",
                url,
                body: data,
                params,
                config,
            });
        }
        async put(url, data, params, config) {
            return await this.request({
                method: "PUT",
                url,
                body: data,
                params,
                config,
            });
        }
        async patch(url, data, params, config) {
            return await this.request({
                method: "PATCH",
                url,
                body: data,
                params,
                config,
            });
        }
        async delete(url, data, params, config) {
            return await this.request({
                method: "DELETE",
                url,
                body: data,
                params,
                config,
            });
        }
    }

    class EnqueuedTask {
        taskUid;
        indexUid;
        status;
        type;
        enqueuedAt;
        constructor(task) {
            this.taskUid = task.taskUid;
            this.indexUid = task.indexUid;
            this.status = task.status;
            this.type = task.type;
            this.enqueuedAt = new Date(task.enqueuedAt);
        }
    }

    class Task {
        indexUid;
        status;
        type;
        uid;
        batchUid;
        canceledBy;
        details;
        error;
        duration;
        startedAt;
        enqueuedAt;
        finishedAt;
        constructor(task) {
            this.indexUid = task.indexUid;
            this.status = task.status;
            this.type = task.type;
            this.uid = task.uid;
            this.batchUid = task.batchUid;
            this.details = task.details;
            this.canceledBy = task.canceledBy;
            this.error = task.error;
            this.duration = task.duration;
            this.startedAt = new Date(task.startedAt);
            this.enqueuedAt = new Date(task.enqueuedAt);
            this.finishedAt = new Date(task.finishedAt);
        }
    }
    class TaskClient {
        httpRequest;
        constructor(config) {
            this.httpRequest = new HttpRequests(config);
        }
        /**
         * Get one task
         *
         * @param uid - Unique identifier of the task
         * @returns
         */
        async getTask(uid) {
            const url = `tasks/${uid}`;
            const taskItem = await this.httpRequest.get(url);
            return new Task(taskItem);
        }
        /**
         * Get tasks
         *
         * @param parameters - Parameters to browse the tasks
         * @returns Promise containing all tasks
         */
        async getTasks(parameters = {}) {
            const url = `tasks`;
            const tasks = await this.httpRequest.get(url, toQueryParams(parameters));
            return {
                ...tasks,
                results: tasks.results.map((task) => new Task(task)),
            };
        }
        /**
         * Wait for a task to be processed.
         *
         * @param taskUid - Task identifier
         * @param options - Additional configuration options
         * @returns Promise returning a task after it has been processed
         */
        async waitForTask(taskUid, { timeOutMs = 5000, intervalMs = 50 } = {}) {
            const startingTime = Date.now();
            while (Date.now() - startingTime < timeOutMs) {
                const response = await this.getTask(taskUid);
                if (![
                    TaskStatus.TASK_ENQUEUED,
                    TaskStatus.TASK_PROCESSING,
                ].includes(response.status))
                    return response;
                await sleep(intervalMs);
            }
            throw new MeiliSearchTimeOutError(`timeout of ${timeOutMs}ms has exceeded on process ${taskUid} when waiting a task to be resolved.`);
        }
        /**
         * Waits for multiple tasks to be processed
         *
         * @param taskUids - Tasks identifier list
         * @param options - Wait options
         * @returns Promise returning a list of tasks after they have been processed
         */
        async waitForTasks(taskUids, { timeOutMs = 5000, intervalMs = 50 } = {}) {
            const tasks = [];
            for (const taskUid of taskUids) {
                const task = await this.waitForTask(taskUid, {
                    timeOutMs,
                    intervalMs,
                });
                tasks.push(task);
            }
            return tasks;
        }
        /**
         * Cancel a list of enqueued or processing tasks.
         *
         * @param parameters - Parameters to filter the tasks.
         * @returns Promise containing an EnqueuedTask
         */
        async cancelTasks(parameters = {}) {
            const url = `tasks/cancel`;
            const task = await this.httpRequest.post(url, {}, toQueryParams(parameters));
            return new EnqueuedTask(task);
        }
        /**
         * Delete a list tasks.
         *
         * @param parameters - Parameters to filter the tasks.
         * @returns Promise containing an EnqueuedTask
         */
        async deleteTasks(parameters = {}) {
            const url = `tasks`;
            const task = await this.httpRequest.delete(url, {}, toQueryParams(parameters));
            return new EnqueuedTask(task);
        }
    }

    class Batch {
        uid;
        details;
        stats;
        startedAt;
        finishedAt;
        duration;
        progress;
        constructor(batch) {
            this.uid = batch.uid;
            this.details = batch.details;
            this.stats = batch.stats;
            this.startedAt = batch.startedAt;
            this.finishedAt = batch.finishedAt;
            this.duration = batch.duration;
            this.progress = batch.progress;
        }
    }
    class BatchClient {
        httpRequest;
        constructor(config) {
            this.httpRequest = new HttpRequests(config);
        }
        /**
         * Get one batch
         *
         * @param uid - Unique identifier of the batch
         * @returns
         */
        async getBatch(uid) {
            const url = `batches/${uid}`;
            const batch = await this.httpRequest.get(url);
            return new Batch(batch);
        }
        /**
         * Get batches
         *
         * @param parameters - Parameters to browse the batches
         * @returns Promise containing all batches
         */
        async getBatches(parameters = {}) {
            const url = `batches`;
            const batches = await this.httpRequest.get(url, toQueryParams(parameters));
            return {
                ...batches,
                results: batches.results.map((batch) => new Batch(batch)),
            };
        }
    }

    // Type definitions for meilisearch
    // Project: https://github.com/meilisearch/meilisearch-js
    // Definitions by: qdequele <quentin@meilisearch.com> <https://github.com/meilisearch>
    // Definitions: https://github.com/meilisearch/meilisearch-js
    // TypeScript Version: ^3.8.3
    /*
     ** TASKS
     */
    const TaskStatus = {
        TASK_PROCESSING: "processing",
        TASK_ENQUEUED: "enqueued"};
    // @TODO: This doesn't seem to be up to date, and its usefullness comes into question.
    const ErrorStatusCode = {
        /** @see https://www.meilisearch.com/docs/reference/errors/error_codes#index_not_found */
        INDEX_NOT_FOUND: "index_not_found"};

    /*
     * Bundle: MeiliSearch / Indexes
     * Project: MeiliSearch - Javascript API
     * Author: Quentin de Quelen <quentin@meilisearch.com>
     * Copyright: 2019, MeiliSearch
     */
    class Index {
        uid;
        primaryKey;
        createdAt;
        updatedAt;
        httpRequest;
        tasks;
        /**
         * @param config - Request configuration options
         * @param uid - UID of the index
         * @param primaryKey - Primary Key of the index
         */
        constructor(config, uid, primaryKey) {
            this.uid = uid;
            this.primaryKey = primaryKey;
            this.httpRequest = new HttpRequests(config);
            this.tasks = new TaskClient(config);
        }
        ///
        /// SEARCH
        ///
        /**
         * Search for documents into an index
         *
         * @param query - Query string
         * @param options - Search options
         * @param config - Additional request configuration options
         * @returns Promise containing the search response
         */
        async search(query, options, config) {
            const url = `indexes/${this.uid}/search`;
            return await this.httpRequest.post(url, removeUndefinedFromObject({ q: query, ...options }), undefined, config);
        }
        /**
         * Search for documents into an index using the GET method
         *
         * @param query - Query string
         * @param options - Search options
         * @param config - Additional request configuration options
         * @returns Promise containing the search response
         */
        async searchGet(query, options, config) {
            const url = `indexes/${this.uid}/search`;
            const parseFilter = (filter) => {
                if (typeof filter === "string")
                    return filter;
                else if (Array.isArray(filter))
                    throw new MeiliSearchError("The filter query parameter should be in string format when using searchGet");
                else
                    return undefined;
            };
            const getParams = {
                q: query,
                ...options,
                filter: parseFilter(options?.filter),
                sort: options?.sort?.join(","),
                facets: options?.facets?.join(","),
                attributesToRetrieve: options?.attributesToRetrieve?.join(","),
                attributesToCrop: options?.attributesToCrop?.join(","),
                attributesToHighlight: options?.attributesToHighlight?.join(","),
                vector: options?.vector?.join(","),
                attributesToSearchOn: options?.attributesToSearchOn?.join(","),
            };
            return await this.httpRequest.get(url, removeUndefinedFromObject(getParams), config);
        }
        /**
         * Search for facet values
         *
         * @param params - Parameters used to search on the facets
         * @param config - Additional request configuration options
         * @returns Promise containing the search response
         */
        async searchForFacetValues(params, config) {
            const url = `indexes/${this.uid}/facet-search`;
            return await this.httpRequest.post(url, removeUndefinedFromObject(params), undefined, config);
        }
        /**
         * Search for similar documents
         *
         * @param params - Parameters used to search for similar documents
         * @returns Promise containing the search response
         */
        async searchSimilarDocuments(params) {
            const url = `indexes/${this.uid}/similar`;
            return await this.httpRequest.post(url, removeUndefinedFromObject(params), undefined);
        }
        ///
        /// INDEX
        ///
        /**
         * Get index information.
         *
         * @returns Promise containing index information
         */
        async getRawInfo() {
            const url = `indexes/${this.uid}`;
            const res = await this.httpRequest.get(url);
            this.primaryKey = res.primaryKey;
            this.updatedAt = new Date(res.updatedAt);
            this.createdAt = new Date(res.createdAt);
            return res;
        }
        /**
         * Fetch and update Index information.
         *
         * @returns Promise to the current Index object with updated information
         */
        async fetchInfo() {
            await this.getRawInfo();
            return this;
        }
        /**
         * Get Primary Key.
         *
         * @returns Promise containing the Primary Key of the index
         */
        async fetchPrimaryKey() {
            this.primaryKey = (await this.getRawInfo()).primaryKey;
            return this.primaryKey;
        }
        /**
         * Create an index.
         *
         * @param uid - Unique identifier of the Index
         * @param options - Index options
         * @param config - Request configuration options
         * @returns Newly created Index object
         */
        static async create(uid, options = {}, config) {
            const url = `indexes`;
            const req = new HttpRequests(config);
            const task = await req.post(url, { ...options, uid });
            return new EnqueuedTask(task);
        }
        /**
         * Update an index.
         *
         * @param data - Data to update
         * @returns Promise to the current Index object with updated information
         */
        async update(data) {
            const url = `indexes/${this.uid}`;
            const task = await this.httpRequest.patch(url, data);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        /**
         * Delete an index.
         *
         * @returns Promise which resolves when index is deleted successfully
         */
        async delete() {
            const url = `indexes/${this.uid}`;
            const task = await this.httpRequest.delete(url);
            return new EnqueuedTask(task);
        }
        ///
        /// TASKS
        ///
        /**
         * Get the list of all the tasks of the index.
         *
         * @param parameters - Parameters to browse the tasks
         * @returns Promise containing all tasks
         */
        async getTasks(parameters = {}) {
            return await this.tasks.getTasks({ ...parameters, indexUids: [this.uid] });
        }
        /**
         * Get one task of the index.
         *
         * @param taskUid - Task identifier
         * @returns Promise containing a task
         */
        async getTask(taskUid) {
            return await this.tasks.getTask(taskUid);
        }
        /**
         * Wait for multiple tasks to be processed.
         *
         * @param taskUids - Tasks identifier
         * @param waitOptions - Options on timeout and interval
         * @returns Promise containing an array of tasks
         */
        async waitForTasks(taskUids, { timeOutMs = 5000, intervalMs = 50 } = {}) {
            return await this.tasks.waitForTasks(taskUids, {
                timeOutMs,
                intervalMs,
            });
        }
        /**
         * Wait for a task to be processed.
         *
         * @param taskUid - Task identifier
         * @param waitOptions - Options on timeout and interval
         * @returns Promise containing an array of tasks
         */
        async waitForTask(taskUid, { timeOutMs = 5000, intervalMs = 50 } = {}) {
            return await this.tasks.waitForTask(taskUid, {
                timeOutMs,
                intervalMs,
            });
        }
        ///
        /// STATS
        ///
        /**
         * Get stats of an index
         *
         * @returns Promise containing object with stats of the index
         */
        async getStats() {
            const url = `indexes/${this.uid}/stats`;
            return await this.httpRequest.get(url);
        }
        ///
        /// DOCUMENTS
        ///
        /**
         * Get documents of an index.
         *
         * @param parameters - Parameters to browse the documents. Parameters can
         *   contain the `filter` field only available in Meilisearch v1.2 and newer
         * @returns Promise containing the returned documents
         */
        async getDocuments(parameters = {}) {
            parameters = removeUndefinedFromObject(parameters);
            // In case `filter` is provided, use `POST /documents/fetch`
            if (parameters.filter !== undefined) {
                try {
                    const url = `indexes/${this.uid}/documents/fetch`;
                    return await this.httpRequest.post(url, parameters);
                }
                catch (e) {
                    if (e instanceof MeiliSearchRequestError) {
                        e.message = versionErrorHintMessage(e.message, "getDocuments");
                    }
                    else if (e instanceof MeiliSearchApiError) {
                        e.message = versionErrorHintMessage(e.message, "getDocuments");
                    }
                    throw e;
                }
                // Else use `GET /documents` method
            }
            else {
                const url = `indexes/${this.uid}/documents`;
                // Transform fields to query parameter string format
                const fields = Array.isArray(parameters?.fields)
                    ? { fields: parameters?.fields?.join(",") }
                    : {};
                return await this.httpRequest.get(url, {
                    ...parameters,
                    ...fields,
                });
            }
        }
        /**
         * Get one document
         *
         * @param documentId - Document ID
         * @param parameters - Parameters applied on a document
         * @returns Promise containing Document response
         */
        async getDocument(documentId, parameters) {
            const url = `indexes/${this.uid}/documents/${documentId}`;
            const fields = (() => {
                if (Array.isArray(parameters?.fields)) {
                    return parameters?.fields?.join(",");
                }
                return undefined;
            })();
            return await this.httpRequest.get(url, removeUndefinedFromObject({
                ...parameters,
                fields,
            }));
        }
        /**
         * Add or replace multiples documents to an index
         *
         * @param documents - Array of Document objects to add/replace
         * @param options - Options on document addition
         * @returns Promise containing an EnqueuedTask
         */
        async addDocuments(documents, options) {
            const url = `indexes/${this.uid}/documents`;
            const task = await this.httpRequest.post(url, documents, options);
            return new EnqueuedTask(task);
        }
        /**
         * Add or replace multiples documents in a string format to an index. It only
         * supports csv, ndjson and json formats.
         *
         * @param documents - Documents provided in a string to add/replace
         * @param contentType - Content type of your document:
         *   'text/csv'|'application/x-ndjson'|'application/json'
         * @param options - Options on document addition
         * @returns Promise containing an EnqueuedTask
         */
        async addDocumentsFromString(documents, contentType, queryParams) {
            const url = `indexes/${this.uid}/documents`;
            const task = await this.httpRequest.post(url, documents, queryParams, {
                headers: {
                    "Content-Type": contentType,
                },
            });
            return new EnqueuedTask(task);
        }
        /**
         * Add or replace multiples documents to an index in batches
         *
         * @param documents - Array of Document objects to add/replace
         * @param batchSize - Size of the batch
         * @param options - Options on document addition
         * @returns Promise containing array of enqueued task objects for each batch
         */
        async addDocumentsInBatches(documents, batchSize = 1000, options) {
            const updates = [];
            for (let i = 0; i < documents.length; i += batchSize) {
                updates.push(await this.addDocuments(documents.slice(i, i + batchSize), options));
            }
            return updates;
        }
        /**
         * Add or update multiples documents to an index
         *
         * @param documents - Array of Document objects to add/update
         * @param options - Options on document update
         * @returns Promise containing an EnqueuedTask
         */
        async updateDocuments(documents, options) {
            const url = `indexes/${this.uid}/documents`;
            const task = await this.httpRequest.put(url, documents, options);
            return new EnqueuedTask(task);
        }
        /**
         * Add or update multiples documents to an index in batches
         *
         * @param documents - Array of Document objects to add/update
         * @param batchSize - Size of the batch
         * @param options - Options on document update
         * @returns Promise containing array of enqueued task objects for each batch
         */
        async updateDocumentsInBatches(documents, batchSize = 1000, options) {
            const updates = [];
            for (let i = 0; i < documents.length; i += batchSize) {
                updates.push(await this.updateDocuments(documents.slice(i, i + batchSize), options));
            }
            return updates;
        }
        /**
         * Add or update multiples documents in a string format to an index. It only
         * supports csv, ndjson and json formats.
         *
         * @param documents - Documents provided in a string to add/update
         * @param contentType - Content type of your document:
         *   'text/csv'|'application/x-ndjson'|'application/json'
         * @param queryParams - Options on raw document addition
         * @returns Promise containing an EnqueuedTask
         */
        async updateDocumentsFromString(documents, contentType, queryParams) {
            const url = `indexes/${this.uid}/documents`;
            const task = await this.httpRequest.put(url, documents, queryParams, {
                headers: {
                    "Content-Type": contentType,
                },
            });
            return new EnqueuedTask(task);
        }
        /**
         * Delete one document
         *
         * @param documentId - Id of Document to delete
         * @returns Promise containing an EnqueuedTask
         */
        async deleteDocument(documentId) {
            const url = `indexes/${this.uid}/documents/${documentId}`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        /**
         * Delete multiples documents of an index.
         *
         * @param params - Params value can be:
         *
         *   - DocumentsDeletionQuery: An object containing the parameters to customize
         *       your document deletion. Only available in Meilisearch v1.2 and newer
         *   - DocumentsIds: An array of document ids to delete
         *
         * @returns Promise containing an EnqueuedTask
         */
        async deleteDocuments(params) {
            // If params is of type DocumentsDeletionQuery
            const isDocumentsDeletionQuery = !Array.isArray(params) && typeof params === "object";
            const endpoint = isDocumentsDeletionQuery
                ? "documents/delete"
                : "documents/delete-batch";
            const url = `indexes/${this.uid}/${endpoint}`;
            try {
                const task = await this.httpRequest.post(url, params);
                return new EnqueuedTask(task);
            }
            catch (e) {
                if (e instanceof MeiliSearchRequestError && isDocumentsDeletionQuery) {
                    e.message = versionErrorHintMessage(e.message, "deleteDocuments");
                }
                else if (e instanceof MeiliSearchApiError) {
                    e.message = versionErrorHintMessage(e.message, "deleteDocuments");
                }
                throw e;
            }
        }
        /**
         * Delete all documents of an index
         *
         * @returns Promise containing an EnqueuedTask
         */
        async deleteAllDocuments() {
            const url = `indexes/${this.uid}/documents`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        /**
         * This is an EXPERIMENTAL feature, which may break without a major version.
         * It's available after Meilisearch v1.10.
         *
         * More info about the feature:
         * https://github.com/orgs/meilisearch/discussions/762 More info about
         * experimental features in general:
         * https://www.meilisearch.com/docs/reference/api/experimental-features
         *
         * @param options - Object containing the function string and related options
         * @returns Promise containing an EnqueuedTask
         */
        async updateDocumentsByFunction(options) {
            const url = `indexes/${this.uid}/documents/edit`;
            const task = await this.httpRequest.post(url, options);
            return new EnqueuedTask(task);
        }
        ///
        /// SETTINGS
        ///
        /**
         * Retrieve all settings
         *
         * @returns Promise containing Settings object
         */
        async getSettings() {
            const url = `indexes/${this.uid}/settings`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update all settings Any parameters not provided will be left unchanged.
         *
         * @param settings - Object containing parameters with their updated values
         * @returns Promise containing an EnqueuedTask
         */
        async updateSettings(settings) {
            const url = `indexes/${this.uid}/settings`;
            const task = await this.httpRequest.patch(url, settings);
            task.enqueued = new Date(task.enqueuedAt);
            return task;
        }
        /**
         * Reset settings.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetSettings() {
            const url = `indexes/${this.uid}/settings`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// PAGINATION SETTINGS
        ///
        /**
         * Get the pagination settings.
         *
         * @returns Promise containing object of pagination settings
         */
        async getPagination() {
            const url = `indexes/${this.uid}/settings/pagination`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the pagination settings.
         *
         * @param pagination - Pagination object
         * @returns Promise containing an EnqueuedTask
         */
        async updatePagination(pagination) {
            const url = `indexes/${this.uid}/settings/pagination`;
            const task = await this.httpRequest.patch(url, pagination);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the pagination settings.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetPagination() {
            const url = `indexes/${this.uid}/settings/pagination`;
            const task = await this.httpRequest.delete(url);
            return new EnqueuedTask(task);
        }
        ///
        /// SYNONYMS
        ///
        /**
         * Get the list of all synonyms
         *
         * @returns Promise containing object of synonym mappings
         */
        async getSynonyms() {
            const url = `indexes/${this.uid}/settings/synonyms`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the list of synonyms. Overwrite the old list.
         *
         * @param synonyms - Mapping of synonyms with their associated words
         * @returns Promise containing an EnqueuedTask
         */
        async updateSynonyms(synonyms) {
            const url = `indexes/${this.uid}/settings/synonyms`;
            const task = await this.httpRequest.put(url, synonyms);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the synonym list to be empty again
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetSynonyms() {
            const url = `indexes/${this.uid}/settings/synonyms`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// STOP WORDS
        ///
        /**
         * Get the list of all stop-words
         *
         * @returns Promise containing array of stop-words
         */
        async getStopWords() {
            const url = `indexes/${this.uid}/settings/stop-words`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the list of stop-words. Overwrite the old list.
         *
         * @param stopWords - Array of strings that contains the stop-words.
         * @returns Promise containing an EnqueuedTask
         */
        async updateStopWords(stopWords) {
            const url = `indexes/${this.uid}/settings/stop-words`;
            const task = await this.httpRequest.put(url, stopWords);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the stop-words list to be empty again
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetStopWords() {
            const url = `indexes/${this.uid}/settings/stop-words`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// RANKING RULES
        ///
        /**
         * Get the list of all ranking-rules
         *
         * @returns Promise containing array of ranking-rules
         */
        async getRankingRules() {
            const url = `indexes/${this.uid}/settings/ranking-rules`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the list of ranking-rules. Overwrite the old list.
         *
         * @param rankingRules - Array that contain ranking rules sorted by order of
         *   importance.
         * @returns Promise containing an EnqueuedTask
         */
        async updateRankingRules(rankingRules) {
            const url = `indexes/${this.uid}/settings/ranking-rules`;
            const task = await this.httpRequest.put(url, rankingRules);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the ranking rules list to its default value
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetRankingRules() {
            const url = `indexes/${this.uid}/settings/ranking-rules`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// DISTINCT ATTRIBUTE
        ///
        /**
         * Get the distinct-attribute
         *
         * @returns Promise containing the distinct-attribute of the index
         */
        async getDistinctAttribute() {
            const url = `indexes/${this.uid}/settings/distinct-attribute`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the distinct-attribute.
         *
         * @param distinctAttribute - Field name of the distinct-attribute
         * @returns Promise containing an EnqueuedTask
         */
        async updateDistinctAttribute(distinctAttribute) {
            const url = `indexes/${this.uid}/settings/distinct-attribute`;
            const task = await this.httpRequest.put(url, distinctAttribute);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the distinct-attribute.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetDistinctAttribute() {
            const url = `indexes/${this.uid}/settings/distinct-attribute`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// FILTERABLE ATTRIBUTES
        ///
        /**
         * Get the filterable-attributes
         *
         * @returns Promise containing an array of filterable-attributes
         */
        async getFilterableAttributes() {
            const url = `indexes/${this.uid}/settings/filterable-attributes`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the filterable-attributes.
         *
         * @param filterableAttributes - Array of strings containing the attributes
         *   that can be used as filters at query time
         * @returns Promise containing an EnqueuedTask
         */
        async updateFilterableAttributes(filterableAttributes) {
            const url = `indexes/${this.uid}/settings/filterable-attributes`;
            const task = await this.httpRequest.put(url, filterableAttributes);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the filterable-attributes.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetFilterableAttributes() {
            const url = `indexes/${this.uid}/settings/filterable-attributes`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// SORTABLE ATTRIBUTES
        ///
        /**
         * Get the sortable-attributes
         *
         * @returns Promise containing array of sortable-attributes
         */
        async getSortableAttributes() {
            const url = `indexes/${this.uid}/settings/sortable-attributes`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the sortable-attributes.
         *
         * @param sortableAttributes - Array of strings containing the attributes that
         *   can be used to sort search results at query time
         * @returns Promise containing an EnqueuedTask
         */
        async updateSortableAttributes(sortableAttributes) {
            const url = `indexes/${this.uid}/settings/sortable-attributes`;
            const task = await this.httpRequest.put(url, sortableAttributes);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the sortable-attributes.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetSortableAttributes() {
            const url = `indexes/${this.uid}/settings/sortable-attributes`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// SEARCHABLE ATTRIBUTE
        ///
        /**
         * Get the searchable-attributes
         *
         * @returns Promise containing array of searchable-attributes
         */
        async getSearchableAttributes() {
            const url = `indexes/${this.uid}/settings/searchable-attributes`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the searchable-attributes.
         *
         * @param searchableAttributes - Array of strings that contains searchable
         *   attributes sorted by order of importance(most to least important)
         * @returns Promise containing an EnqueuedTask
         */
        async updateSearchableAttributes(searchableAttributes) {
            const url = `indexes/${this.uid}/settings/searchable-attributes`;
            const task = await this.httpRequest.put(url, searchableAttributes);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the searchable-attributes.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetSearchableAttributes() {
            const url = `indexes/${this.uid}/settings/searchable-attributes`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// DISPLAYED ATTRIBUTE
        ///
        /**
         * Get the displayed-attributes
         *
         * @returns Promise containing array of displayed-attributes
         */
        async getDisplayedAttributes() {
            const url = `indexes/${this.uid}/settings/displayed-attributes`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the displayed-attributes.
         *
         * @param displayedAttributes - Array of strings that contains attributes of
         *   an index to display
         * @returns Promise containing an EnqueuedTask
         */
        async updateDisplayedAttributes(displayedAttributes) {
            const url = `indexes/${this.uid}/settings/displayed-attributes`;
            const task = await this.httpRequest.put(url, displayedAttributes);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the displayed-attributes.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetDisplayedAttributes() {
            const url = `indexes/${this.uid}/settings/displayed-attributes`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// TYPO TOLERANCE
        ///
        /**
         * Get the typo tolerance settings.
         *
         * @returns Promise containing the typo tolerance settings.
         */
        async getTypoTolerance() {
            const url = `indexes/${this.uid}/settings/typo-tolerance`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the typo tolerance settings.
         *
         * @param typoTolerance - Object containing the custom typo tolerance
         *   settings.
         * @returns Promise containing object of the enqueued update
         */
        async updateTypoTolerance(typoTolerance) {
            const url = `indexes/${this.uid}/settings/typo-tolerance`;
            const task = await this.httpRequest.patch(url, typoTolerance);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        /**
         * Reset the typo tolerance settings.
         *
         * @returns Promise containing object of the enqueued update
         */
        async resetTypoTolerance() {
            const url = `indexes/${this.uid}/settings/typo-tolerance`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// FACETING
        ///
        /**
         * Get the faceting settings.
         *
         * @returns Promise containing object of faceting index settings
         */
        async getFaceting() {
            const url = `indexes/${this.uid}/settings/faceting`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the faceting settings.
         *
         * @param faceting - Faceting index settings object
         * @returns Promise containing an EnqueuedTask
         */
        async updateFaceting(faceting) {
            const url = `indexes/${this.uid}/settings/faceting`;
            const task = await this.httpRequest.patch(url, faceting);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the faceting settings.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetFaceting() {
            const url = `indexes/${this.uid}/settings/faceting`;
            const task = await this.httpRequest.delete(url);
            return new EnqueuedTask(task);
        }
        ///
        /// SEPARATOR TOKENS
        ///
        /**
         * Get the list of all separator tokens.
         *
         * @returns Promise containing array of separator tokens
         */
        async getSeparatorTokens() {
            const url = `indexes/${this.uid}/settings/separator-tokens`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the list of separator tokens. Overwrite the old list.
         *
         * @param separatorTokens - Array that contains separator tokens.
         * @returns Promise containing an EnqueuedTask or null
         */
        async updateSeparatorTokens(separatorTokens) {
            const url = `indexes/${this.uid}/settings/separator-tokens`;
            const task = await this.httpRequest.put(url, separatorTokens);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the separator tokens list to its default value
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetSeparatorTokens() {
            const url = `indexes/${this.uid}/settings/separator-tokens`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// NON-SEPARATOR TOKENS
        ///
        /**
         * Get the list of all non-separator tokens.
         *
         * @returns Promise containing array of non-separator tokens
         */
        async getNonSeparatorTokens() {
            const url = `indexes/${this.uid}/settings/non-separator-tokens`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the list of non-separator tokens. Overwrite the old list.
         *
         * @param nonSeparatorTokens - Array that contains non-separator tokens.
         * @returns Promise containing an EnqueuedTask or null
         */
        async updateNonSeparatorTokens(nonSeparatorTokens) {
            const url = `indexes/${this.uid}/settings/non-separator-tokens`;
            const task = await this.httpRequest.put(url, nonSeparatorTokens);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the non-separator tokens list to its default value
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetNonSeparatorTokens() {
            const url = `indexes/${this.uid}/settings/non-separator-tokens`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// DICTIONARY
        ///
        /**
         * Get the dictionary settings of a Meilisearch index.
         *
         * @returns Promise containing the dictionary settings
         */
        async getDictionary() {
            const url = `indexes/${this.uid}/settings/dictionary`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the dictionary settings. Overwrite the old settings.
         *
         * @param dictionary - Array that contains the new dictionary settings.
         * @returns Promise containing an EnqueuedTask or null
         */
        async updateDictionary(dictionary) {
            const url = `indexes/${this.uid}/settings/dictionary`;
            const task = await this.httpRequest.put(url, dictionary);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the dictionary settings to its default value
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetDictionary() {
            const url = `indexes/${this.uid}/settings/dictionary`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// PROXIMITY PRECISION
        ///
        /**
         * Get the proximity precision settings of a Meilisearch index.
         *
         * @returns Promise containing the proximity precision settings
         */
        async getProximityPrecision() {
            const url = `indexes/${this.uid}/settings/proximity-precision`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the proximity precision settings. Overwrite the old settings.
         *
         * @param proximityPrecision - String that contains the new proximity
         *   precision settings.
         * @returns Promise containing an EnqueuedTask or null
         */
        async updateProximityPrecision(proximityPrecision) {
            const url = `indexes/${this.uid}/settings/proximity-precision`;
            const task = await this.httpRequest.put(url, proximityPrecision);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the proximity precision settings to its default value
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetProximityPrecision() {
            const url = `indexes/${this.uid}/settings/proximity-precision`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// EMBEDDERS
        ///
        /**
         * Get the embedders settings of a Meilisearch index.
         *
         * @returns Promise containing the embedders settings
         */
        async getEmbedders() {
            const url = `indexes/${this.uid}/settings/embedders`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the embedders settings. Overwrite the old settings.
         *
         * @param embedders - Object that contains the new embedders settings.
         * @returns Promise containing an EnqueuedTask or null
         */
        async updateEmbedders(embedders) {
            const url = `indexes/${this.uid}/settings/embedders`;
            const task = await this.httpRequest.patch(url, embedders);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the embedders settings to its default value
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetEmbedders() {
            const url = `indexes/${this.uid}/settings/embedders`;
            const task = await this.httpRequest.delete(url);
            task.enqueuedAt = new Date(task.enqueuedAt);
            return task;
        }
        ///
        /// SEARCHCUTOFFMS SETTINGS
        ///
        /**
         * Get the SearchCutoffMs settings.
         *
         * @returns Promise containing object of SearchCutoffMs settings
         */
        async getSearchCutoffMs() {
            const url = `indexes/${this.uid}/settings/search-cutoff-ms`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the SearchCutoffMs settings.
         *
         * @param searchCutoffMs - Object containing SearchCutoffMsSettings
         * @returns Promise containing an EnqueuedTask
         */
        async updateSearchCutoffMs(searchCutoffMs) {
            const url = `indexes/${this.uid}/settings/search-cutoff-ms`;
            const task = await this.httpRequest.put(url, searchCutoffMs);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the SearchCutoffMs settings.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetSearchCutoffMs() {
            const url = `indexes/${this.uid}/settings/search-cutoff-ms`;
            const task = await this.httpRequest.delete(url);
            return new EnqueuedTask(task);
        }
        ///
        /// LOCALIZED ATTRIBUTES SETTINGS
        ///
        /**
         * Get the localized attributes settings.
         *
         * @returns Promise containing object of localized attributes settings
         */
        async getLocalizedAttributes() {
            const url = `indexes/${this.uid}/settings/localized-attributes`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the localized attributes settings.
         *
         * @param localizedAttributes - Localized attributes object
         * @returns Promise containing an EnqueuedTask
         */
        async updateLocalizedAttributes(localizedAttributes) {
            const url = `indexes/${this.uid}/settings/localized-attributes`;
            const task = await this.httpRequest.put(url, localizedAttributes);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the localized attributes settings.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetLocalizedAttributes() {
            const url = `indexes/${this.uid}/settings/localized-attributes`;
            const task = await this.httpRequest.delete(url);
            return new EnqueuedTask(task);
        }
        ///
        /// FACET SEARCH SETTINGS
        ///
        /**
         * Get the facet search settings.
         *
         * @returns Promise containing object of facet search settings
         */
        async getFacetSearch() {
            const url = `indexes/${this.uid}/settings/facet-search`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the facet search settings.
         *
         * @param facetSearch - Boolean value
         * @returns Promise containing an EnqueuedTask
         */
        async updateFacetSearch(facetSearch) {
            const url = `indexes/${this.uid}/settings/facet-search`;
            const task = await this.httpRequest.put(url, facetSearch);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the facet search settings.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetFacetSearch() {
            const url = `indexes/${this.uid}/settings/facet-search`;
            const task = await this.httpRequest.delete(url);
            return new EnqueuedTask(task);
        }
        ///
        /// PREFIX SEARCH SETTINGS
        ///
        /**
         * Get the prefix search settings.
         *
         * @returns Promise containing object of prefix search settings
         */
        async getPrefixSearch() {
            const url = `indexes/${this.uid}/settings/prefix-search`;
            return await this.httpRequest.get(url);
        }
        /**
         * Update the prefix search settings.
         *
         * @param prefixSearch - PrefixSearch value
         * @returns Promise containing an EnqueuedTask
         */
        async updatePrefixSearch(prefixSearch) {
            const url = `indexes/${this.uid}/settings/prefix-search`;
            const task = await this.httpRequest.put(url, prefixSearch);
            return new EnqueuedTask(task);
        }
        /**
         * Reset the prefix search settings.
         *
         * @returns Promise containing an EnqueuedTask
         */
        async resetPrefixSearch() {
            const url = `indexes/${this.uid}/settings/prefix-search`;
            const task = await this.httpRequest.delete(url);
            return new EnqueuedTask(task);
        }
    }

    /*
     * Bundle: MeiliSearch
     * Project: MeiliSearch - Javascript API
     * Author: Quentin de Quelen <quentin@meilisearch.com>
     * Copyright: 2019, MeiliSearch
     */
    class MeiliSearch {
        config;
        httpRequest;
        tasks;
        batches;
        /**
         * Creates new MeiliSearch instance
         *
         * @param config - Configuration object
         */
        constructor(config) {
            this.config = config;
            this.httpRequest = new HttpRequests(config);
            this.tasks = new TaskClient(config);
            this.batches = new BatchClient(config);
        }
        /**
         * Return an Index instance
         *
         * @param indexUid - The index UID
         * @returns Instance of Index
         */
        index(indexUid) {
            return new Index(this.config, indexUid);
        }
        /**
         * Gather information about an index by calling MeiliSearch and return an
         * Index instance with the gathered information
         *
         * @param indexUid - The index UID
         * @returns Promise returning Index instance
         */
        async getIndex(indexUid) {
            return new Index(this.config, indexUid).fetchInfo();
        }
        /**
         * Gather information about an index by calling MeiliSearch and return the raw
         * JSON response
         *
         * @param indexUid - The index UID
         * @returns Promise returning index information
         */
        async getRawIndex(indexUid) {
            return new Index(this.config, indexUid).getRawInfo();
        }
        /**
         * Get all the indexes as Index instances.
         *
         * @param parameters - Parameters to browse the indexes
         * @returns Promise returning array of raw index information
         */
        async getIndexes(parameters = {}) {
            const rawIndexes = await this.getRawIndexes(parameters);
            const indexes = rawIndexes.results.map((index) => new Index(this.config, index.uid, index.primaryKey));
            return { ...rawIndexes, results: indexes };
        }
        /**
         * Get all the indexes in their raw value (no Index instances).
         *
         * @param parameters - Parameters to browse the indexes
         * @returns Promise returning array of raw index information
         */
        async getRawIndexes(parameters = {}) {
            const url = `indexes`;
            return await this.httpRequest.get(url, parameters);
        }
        /**
         * Create a new index
         *
         * @param uid - The index UID
         * @param options - Index options
         * @returns Promise returning Index instance
         */
        async createIndex(uid, options = {}) {
            return await Index.create(uid, options, this.config);
        }
        /**
         * Update an index
         *
         * @param uid - The index UID
         * @param options - Index options to update
         * @returns Promise returning Index instance after updating
         */
        async updateIndex(uid, options = {}) {
            return await new Index(this.config, uid).update(options);
        }
        /**
         * Delete an index
         *
         * @param uid - The index UID
         * @returns Promise which resolves when index is deleted successfully
         */
        async deleteIndex(uid) {
            return await new Index(this.config, uid).delete();
        }
        /**
         * Deletes an index if it already exists.
         *
         * @param uid - The index UID
         * @returns Promise which resolves to true when index exists and is deleted
         *   successfully, otherwise false if it does not exist
         */
        async deleteIndexIfExists(uid) {
            try {
                await this.deleteIndex(uid);
                return true;
            }
            catch (e) {
                if (e.code === ErrorStatusCode.INDEX_NOT_FOUND) {
                    return false;
                }
                throw e;
            }
        }
        /**
         * Swaps a list of index tuples.
         *
         * @param params - List of indexes tuples to swap.
         * @returns Promise returning object of the enqueued task
         */
        async swapIndexes(params) {
            const url = "/swap-indexes";
            return await this.httpRequest.post(url, params);
        }
        ///
        /// Multi Search
        ///
        /**
         * Perform multiple search queries.
         *
         * It is possible to make multiple search queries on the same index or on
         * different ones
         *
         * @example
         *
         * ```ts
         * client.multiSearch({
         *   queries: [
         *     { indexUid: "movies", q: "wonder" },
         *     { indexUid: "books", q: "flower" },
         *   ],
         * });
         * ```
         *
         * @param queries - Search queries
         * @param config - Additional request configuration options
         * @returns Promise containing the search responses
         */
        async multiSearch(queries, config) {
            const url = `multi-search`;
            return await this.httpRequest.post(url, queries, undefined, config);
        }
        ///
        /// TASKS
        ///
        /**
         * Get the list of all client tasks
         *
         * @param parameters - Parameters to browse the tasks
         * @returns Promise returning all tasks
         */
        async getTasks(parameters = {}) {
            return await this.tasks.getTasks(parameters);
        }
        /**
         * Get one task on the client scope
         *
         * @param taskUid - Task identifier
         * @returns Promise returning a task
         */
        async getTask(taskUid) {
            return await this.tasks.getTask(taskUid);
        }
        /**
         * Wait for multiple tasks to be finished.
         *
         * @param taskUids - Tasks identifier
         * @param waitOptions - Options on timeout and interval
         * @returns Promise returning an array of tasks
         */
        async waitForTasks(taskUids, { timeOutMs = 5000, intervalMs = 50 } = {}) {
            return await this.tasks.waitForTasks(taskUids, {
                timeOutMs,
                intervalMs,
            });
        }
        /**
         * Wait for a task to be finished.
         *
         * @param taskUid - Task identifier
         * @param waitOptions - Options on timeout and interval
         * @returns Promise returning an array of tasks
         */
        async waitForTask(taskUid, { timeOutMs = 5000, intervalMs = 50 } = {}) {
            return await this.tasks.waitForTask(taskUid, {
                timeOutMs,
                intervalMs,
            });
        }
        /**
         * Cancel a list of enqueued or processing tasks.
         *
         * @param parameters - Parameters to filter the tasks.
         * @returns Promise containing an EnqueuedTask
         */
        async cancelTasks(parameters) {
            return await this.tasks.cancelTasks(parameters);
        }
        /**
         * Delete a list of tasks.
         *
         * @param parameters - Parameters to filter the tasks.
         * @returns Promise containing an EnqueuedTask
         */
        async deleteTasks(parameters = {}) {
            return await this.tasks.deleteTasks(parameters);
        }
        /**
         * Get all the batches
         *
         * @param parameters - Parameters to browse the batches
         * @returns Promise returning all batches
         */
        async getBatches(parameters = {}) {
            return await this.batches.getBatches(parameters);
        }
        /**
         * Get one batch
         *
         * @param uid - Batch identifier
         * @returns Promise returning a batch
         */
        async getBatch(uid) {
            return await this.batches.getBatch(uid);
        }
        ///
        /// KEYS
        ///
        /**
         * Get all API keys
         *
         * @param parameters - Parameters to browse the indexes
         * @returns Promise returning an object with keys
         */
        async getKeys(parameters = {}) {
            const url = `keys`;
            const keys = await this.httpRequest.get(url, parameters);
            keys.results = keys.results.map((key) => ({
                ...key,
                createdAt: new Date(key.createdAt),
                updatedAt: new Date(key.updatedAt),
            }));
            return keys;
        }
        /**
         * Get one API key
         *
         * @param keyOrUid - Key or uid of the API key
         * @returns Promise returning a key
         */
        async getKey(keyOrUid) {
            const url = `keys/${keyOrUid}`;
            return await this.httpRequest.get(url);
        }
        /**
         * Create one API key
         *
         * @param options - Key options
         * @returns Promise returning a key
         */
        async createKey(options) {
            const url = `keys`;
            return await this.httpRequest.post(url, options);
        }
        /**
         * Update one API key
         *
         * @param keyOrUid - Key
         * @param options - Key options
         * @returns Promise returning a key
         */
        async updateKey(keyOrUid, options) {
            const url = `keys/${keyOrUid}`;
            return await this.httpRequest.patch(url, options);
        }
        /**
         * Delete one API key
         *
         * @param keyOrUid - Key
         * @returns
         */
        async deleteKey(keyOrUid) {
            const url = `keys/${keyOrUid}`;
            return await this.httpRequest.delete(url);
        }
        ///
        /// HEALTH
        ///
        /**
         * Checks if the server is healthy, otherwise an error will be thrown.
         *
         * @returns Promise returning an object with health details
         */
        async health() {
            const url = `health`;
            return await this.httpRequest.get(url);
        }
        /**
         * Checks if the server is healthy, return true or false.
         *
         * @returns Promise returning a boolean
         */
        async isHealthy() {
            try {
                const url = `health`;
                await this.httpRequest.get(url);
                return true;
            }
            catch {
                return false;
            }
        }
        ///
        /// STATS
        ///
        /**
         * Get the stats of all the database
         *
         * @returns Promise returning object of all the stats
         */
        async getStats() {
            const url = `stats`;
            return await this.httpRequest.get(url);
        }
        ///
        /// VERSION
        ///
        /**
         * Get the version of MeiliSearch
         *
         * @returns Promise returning object with version details
         */
        async getVersion() {
            const url = `version`;
            return await this.httpRequest.get(url);
        }
        ///
        /// DUMPS
        ///
        /**
         * Creates a dump
         *
         * @returns Promise returning object of the enqueued task
         */
        async createDump() {
            const url = `dumps`;
            const task = await this.httpRequest.post(url);
            return new EnqueuedTask(task);
        }
        ///
        /// SNAPSHOTS
        ///
        /**
         * Creates a snapshot
         *
         * @returns Promise returning object of the enqueued task
         */
        async createSnapshot() {
            const url = `snapshots`;
            const task = await this.httpRequest.post(url);
            return new EnqueuedTask(task);
        }
    }

    /**
     * Ghost Meilisearch Search UI
     * A search UI for Ghost blogs using Meilisearch
     */
    class GhostMeilisearchSearch {
        constructor(config = {}) {
            // Default configuration
            const defaultConfig = {
                meilisearchHost: null,
                meilisearchApiKey: null,
                indexName: null,
                commonSearches: [],
                theme: "system",
                enableHighlighting: true,
                searchFields: {
                    title: { weight: 5, highlight: true },
                    plaintext: { weight: 4, highlight: true },
                    excerpt: { weight: 3, highlight: true },
                    html: { weight: 1, highlight: true },
                },
                // AI Search Configuration
                enableAiSearch: false,
                aiSearchEmbedder: null,
                aiSearchLimit: 3, // Limit for AI results
            };

            // Merge default config with user config
            this.config = {
                ...defaultConfig,
                ...config,
            };

            // Initialize state
            this.state = {
                isOpen: false,
                query: "",
                normalResults: [], // Renamed from results
                aiResults: [], // Added for AI search results
                loading: false,
                selectedIndex: -1,
                error: null,
            };

            // Initialize MeiliSearch client
            this.client = new MeiliSearch({
                host: this.config.meilisearchHost,
                apiKey: this.config.meilisearchApiKey,
            });

            // Get index
            this.index = this.client.index(this.config.indexName);

            // Create DOM elements
            this.createDOMElements();

            // Apply theme
            this.applyTheme();

            // Setup color scheme observer
            this.setupColorSchemeObserver();

            // Add event listeners
            this.addEventListeners();

            // Populate common searches
            this.populateCommonSearches();

            // Adjust modal for screen size
            this.adjustModalForScreenSize();
        }

        /**
         * Create DOM elements for the search UI
         */
        createDOMElements() {
            // Create wrapper element
            this.wrapper = document.createElement("div");
            this.wrapper.id = "ms-search-wrapper";
            document.body.appendChild(this.wrapper);

            // Create modal element
            this.modal = document.createElement("div");
            this.modal.id = "ms-search-modal";
            this.modal.classList.add("hidden");
            this.wrapper.appendChild(this.modal);

            // Create modal content
            this.modal.innerHTML = `
      <div class="ms-backdrop"></div>
      <div class="ms-modal-container">
        <button class="ms-close-button" aria-label="Close search">&times;</button>
        <div class="ms-modal-content">
          <div class="ms-search-header">
            <input type="text" class="ms-search-input" placeholder="Search..." aria-label="Search">
          </div>
          <div class="ms-keyboard-hints">
            <span><span class="ms-kbd">↑</span><span class="ms-kbd">↓</span> to navigate</span>
            <span><span class="ms-kbd">↵</span> to select</span>
            <span><span class="ms-kbd">ESC</span> to close</span>
          </div>
          <div class="ms-results-container">
            <div class="ms-common-searches">
              <div class="ms-common-searches-title">Common searches</div>
              <div class="ms-common-searches-list"></div>
            </div>
            <div class="ms-ai-results-section hidden">
              <div class="ms-results-section-title">AI Suggestions</div>
              <ul class="ms-ai-hits-list"></ul>
            </div>
            <div class="ms-normal-results-section">
              <div class="ms-results-section-title">Keyword Matches</div>
              <ul class="ms-normal-hits-list"></ul>
            </div>
            <div class="ms-loading-state">
              <div class="ms-loading-spinner"></div>
              <div>Searching...</div>
            </div>
            <div class="ms-empty-state">
              <div class="ms-empty-message">No results found for your search.</div>
            </div>
          </div>
        </div>
      </div>
    `;

            // Get references to elements
            this.searchInput = this.modal.querySelector(".ms-search-input");
            this.closeButton = this.modal.querySelector(".ms-close-button");
            this.aiResultsSection = this.modal.querySelector(
                ".ms-ai-results-section"
            );
            this.aiHitsList = this.modal.querySelector(".ms-ai-hits-list");
            this.normalResultsSection = this.modal.querySelector(
                ".ms-normal-results-section"
            ); // Added for potential styling/visibility control
            this.normalHitsList = this.modal.querySelector(".ms-normal-hits-list"); // Renamed from hitsList
            this.loadingState = this.modal.querySelector(".ms-loading-state");
            this.emptyState = this.modal.querySelector(".ms-empty-state");
            this.commonSearchesList = this.modal.querySelector(
                ".ms-common-searches-list"
            );
            this.commonSearchesSection = this.modal.querySelector(
                ".ms-common-searches"
            );

            // Populate common searches
            this.populateCommonSearches();

            // Apply theme based on page color scheme
            this.applyTheme();
        }

        /**
         * Populate common searches section
         */
        populateCommonSearches() {
            if (
                !this.config.commonSearches ||
                this.config.commonSearches.length === 0
            ) {
                this.commonSearchesSection.classList.add("hidden");
                return;
            }

            this.commonSearchesList.innerHTML = "";
            this.config.commonSearches.forEach((search) => {
                const button = document.createElement("button");
                button.classList.add("ms-common-search-btn");
                button.textContent = search;
                button.addEventListener("click", () => {
                    this.searchInput.value = search;
                    this.state.query = search;
                    this.performSearch();
                });
                this.commonSearchesList.appendChild(button);
            });
        }

        /**
         * Apply theme based on page color scheme
         */
        applyTheme() {
            // First check for data-color-scheme on html or body element
            const htmlColorScheme =
                document.documentElement.getAttribute("data-color-scheme");
            const bodyColorScheme = document.body.getAttribute("data-color-scheme");
            const pageColorScheme =
                htmlColorScheme || bodyColorScheme || this.config.theme;

            // Remove any existing classes
            this.wrapper.classList.remove("dark", "light");

            if (pageColorScheme === "dark") {
                this.wrapper.classList.add("dark");
            } else if (pageColorScheme === "system") {
                // Check system preference
                const prefersDark = window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches;
                if (prefersDark) {
                    this.wrapper.classList.add("dark");
                } else {
                    this.wrapper.classList.add("light");
                }

                // Listen for changes in system preference
                window
                    .matchMedia("(prefers-color-scheme: dark)")
                    .addEventListener("change", (e) => {
                        this.wrapper.classList.remove("dark", "light");
                        if (e.matches) {
                            this.wrapper.classList.add("dark");
                        } else {
                            this.wrapper.classList.add("light");
                        }
                    });
            } else {
                // Default to light
                this.wrapper.classList.add("light");
            }

            // Add MutationObserver to watch for changes in data-color-scheme
            this.setupColorSchemeObserver();
        }

        /**
         * Set up observer to watch for changes in data-color-scheme
         */
        setupColorSchemeObserver() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (
                        mutation.type === "attributes" &&
                        mutation.attributeName === "data-color-scheme"
                    ) {
                        this.applyTheme();
                    }
                });
            });

            // Observe both html and body for changes
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["data-color-scheme"],
            });
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ["data-color-scheme"],
            });
        }

        /**
         * Add event listeners
         */
        addEventListeners() {
            // Close button click
            this.closeButton.addEventListener("click", () => this.close());

            // Backdrop click
            this.modal
                .querySelector(".ms-backdrop")
                .addEventListener("click", () => this.close());

            // Search input
            this.searchInput.addEventListener("input", () => {
                this.state.query = this.searchInput.value;
                this.performSearch();
            });

            // Keyboard navigation
            document.addEventListener("keydown", this.handleKeyDown.bind(this));

            // Add click event to search triggers
            document.querySelectorAll("[data-ghost-search]").forEach((el) => {
                el.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.open();
                });
            });

            // Keyboard shortcuts
            document.addEventListener("keydown", (e) => {
                // Cmd+K or Ctrl+K
                if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                    e.preventDefault();
                    this.open();
                }

                // Forward slash (/) when not in an input
                if (
                    e.key === "/" &&
                    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
                ) {
                    e.preventDefault();
                    this.open();
                }
            });

            // Handle window resize
            window.addEventListener("resize", () => {
                if (this.state.isOpen) {
                    // Adjust modal position and size on resize
                    this.adjustModalForScreenSize();
                }
            });
        }

        /**
         * Handle keyboard navigation
         */
        handleKeyDown(e) {
            if (!this.state.isOpen) return;

            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    this.close();
                    break;
                case "ArrowDown":
                    e.preventDefault(); // Prevent page scrolling
                    this.navigateResults(1);
                    break;
                case "ArrowUp":
                    e.preventDefault(); // Prevent page scrolling
                    this.navigateResults(-1);
                    break;
                case "Enter":
                    e.preventDefault();
                    this.selectResult();
                    break;
            }
        }

        /**
         * Adjust modal for different screen sizes
         */
        adjustModalForScreenSize() {
            const isMobile = window.innerWidth < 640;

            if (isMobile) {
                // Mobile optimizations
                this.modal.querySelector(".ms-modal-content").style.height =
                    "100vh";
                this.modal.querySelector(".ms-results-container").style.maxHeight =
                    "calc(100vh - 7rem)";
            } else {
                // Desktop optimizations
                this.modal.querySelector(".ms-modal-content").style.height = "";
                this.modal.querySelector(".ms-results-container").style.maxHeight =
                    "";
            }
        }

        /**
         * Navigate through search results
         */
        navigateResults(direction) {
            // Combine results from both lists for navigation
            const combinedResults = [
                ...(this.config.enableAiSearch ? this.state.aiResults : []),
                ...this.state.normalResults,
            ];

            const totalResults = combinedResults.length;
            if (totalResults === 0) return;

            // Calculate new index
            let newIndex = this.state.selectedIndex + direction;

            // Wrap around
            if (newIndex < 0) {
                newIndex = totalResults - 1;
            } else if (newIndex >= totalResults) {
                newIndex = 0;
            }

            // Update selected index
            this.state.selectedIndex = newIndex;

            // Update UI
            this.updateSelectedResult();
        }

        /**
         * Update the selected result in the UI across both lists
         */
        updateSelectedResult() {
            // Get all result links from both lists
            const resultElements = this.modal.querySelectorAll(".ms-result-link");

            // Remove selected class from all results
            resultElements.forEach((el) => el.classList.remove("ms-selected"));

            // Add selected class to current result if index is valid
            if (
                this.state.selectedIndex >= 0 &&
                this.state.selectedIndex < resultElements.length
            ) {
                const selectedElement = resultElements[this.state.selectedIndex];
                selectedElement.classList.add("ms-selected");

                // Scroll into view if needed
                const container = this.modal.querySelector(".ms-results-container");
                // Get position relative to the container, not just the list
                const elementTop = selectedElement.offsetTop - container.offsetTop;
                const elementBottom = elementTop + selectedElement.offsetHeight;
                const containerScrollTop = container.scrollTop;
                const containerVisibleHeight = container.offsetHeight;

                if (elementTop < containerScrollTop) {
                    // Element is above the visible area
                    container.scrollTop = elementTop;
                } else if (
                    elementBottom >
                    containerScrollTop + containerVisibleHeight
                ) {
                    // Element is below the visible area
                    container.scrollTop = elementBottom - containerVisibleHeight;
                }
                // No scrolling needed if element is already within the visible area
            }
        }

        /**
         * Select the current result from the combined list
         */
        selectResult() {
            // Combine results from both lists
            const combinedResults = [
                ...(this.config.enableAiSearch ? this.state.aiResults : []),
                ...this.state.normalResults,
            ];

            const totalResults = combinedResults.length;
            if (
                totalResults === 0 ||
                this.state.selectedIndex < 0 ||
                this.state.selectedIndex >= totalResults
            ) {
                return; // No valid selection
            }

            const selectedResult = combinedResults[this.state.selectedIndex];

            // Close the search UI first
            this.close();

            // Then redirect to the URL or slug
            const targetUrl =
                selectedResult.url ||
                (selectedResult.slug ? `/${selectedResult.slug}` : null);

            if (targetUrl) {
                // Use setTimeout to ensure the close animation can start before navigation
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 10);
            } else {
                console.warn("Selected result has no URL or slug:", selectedResult);
            }
        }

        /**
         * Open the search modal
         */
        open() {
            this.state.isOpen = true;
            this.modal.classList.remove("hidden");
            this.searchInput.focus();

            // Check if search input is empty and hide elements if needed
            if (this.state.query.trim() === "") {
                this.modal
                    .querySelector(".ms-keyboard-hints")
                    .classList.add("hidden");
                this.modal
                    .querySelector(".ms-results-container")
                    .classList.add("ms-results-empty");
            } else {
                this.modal
                    .querySelector(".ms-keyboard-hints")
                    .classList.remove("hidden");
                this.modal
                    .querySelector(".ms-results-container")
                    .classList.remove("ms-results-empty");
            }

            // Prevent body scrolling
            document.body.style.overflow = "hidden";

            // Adjust for screen size
            this.adjustModalForScreenSize();
        }

        /**
         * Close the search modal
         */
        close() {
            this.state.isOpen = false;
            this.modal.classList.add("hidden");

            // Reset state
            this.state.selectedIndex = -1;

            // Allow body scrolling
            document.body.style.overflow = "";
        }

        /**
         * Extract text between double quotes for exact phrase matching
         * @param {string} text - The text to extract from
         * @returns {string|null} The extracted text or null if no quoted phrase found
         */
        extractTextBetweenQuotes(text) {
            if (!text) return null;
            const match = text.match(/"([^"]+)"/);
            return match ? match[1] : null;
        }

        /**
         * Perform search with current query
         */
        async performSearch() {
            const query = this.state.query.trim();

            // Reset results and hide AI section initially
            this.state.aiResults = [];
            this.state.normalResults = [];
            this.aiResultsSection.classList.add("hidden");
            this.normalResultsSection.classList.remove("hidden"); // Ensure normal section is visible

            // Show/hide common searches based on query
            if (query === "") {
                this.commonSearchesSection.classList.remove("hidden");
                this.aiHitsList.innerHTML = ""; // Clear AI list
                this.normalHitsList.innerHTML = ""; // Clear normal list
                this.loadingState.classList.remove("active");
                this.emptyState.classList.remove("active");

                // Hide keyboard hints and results container when search is empty
                this.modal
                    .querySelector(".ms-keyboard-hints")
                    .classList.add("hidden");
                this.modal
                    .querySelector(".ms-results-container")
                    .classList.add("ms-results-empty");

                return;
            } else {
                this.commonSearchesSection.classList.add("hidden");

                // Show keyboard hints and results container when search has content
                this.modal
                    .querySelector(".ms-keyboard-hints")
                    .classList.remove("hidden");
                this.modal
                    .querySelector(".ms-results-container")
                    .classList.remove("ms-results-empty");
            }

            // Set loading state
            this.state.loading = true;
            this.loadingState.classList.add("active");
            this.emptyState.classList.remove("active");

            try {
                // Prepare base search parameters
                const baseSearchParams = {
                    limit: 100, // Consider making this configurable?
                    attributesToHighlight: Object.entries(this.config.searchFields)
                        .filter(([_, config]) => config.highlight)
                        .map(([field]) => field),
                    attributesToRetrieve: [
                        "title",
                        "url",
                        "excerpt",
                        "plaintext",
                        "tags",
                        "slug", // Ensure slug is retrieved
                        "visibility", // <-- Add visibility here
                        // Add any other fields needed for display or logic
                    ],
                    highlightPreTag: "<em>", // Ensure consistent highlighting tags
                    highlightPostTag: "</em>",
                };

                let aiSearchPromise = Promise.resolve({ hits: [] }); // Default to empty results
                let normalSearchPromise;

                // --- Conditional Search Execution ---
                if (this.config.enableAiSearch && this.config.aiSearchEmbedder) {
                    // --- AI Search Enabled ---
                    this.aiResultsSection.classList.remove("hidden"); // Show AI section

                    // AI Search Parameters (using hybrid)
                    const aiSearchParams = {
                        ...baseSearchParams,
                        limit: this.config.aiSearchLimit, // Apply AI-specific limit
                        hybrid: {
                            embedder: this.config.aiSearchEmbedder,
                            // semanticRatio: 0.9 // Optional: Tune ratio if needed
                        },
                        // attributesToSearchOn: undefined, // Let hybrid handle searchable attributes
                        // matchingStrategy: undefined // Let hybrid handle matching
                    };
                    aiSearchPromise = this.index.search(query, aiSearchParams);

                    // Normal Search Parameters (when AI is also enabled)
                    const normalSearchParams = {
                        ...baseSearchParams,
                        attributesToSearchOn: ["title", "plaintext", "excerpt"], // Specify for keyword search
                        matchingStrategy: "last", // Default strategy for keyword search
                    };
                    normalSearchPromise = this.index.search(
                        query,
                        normalSearchParams
                    );
                } else {
                    // --- AI Search Disabled (Standard Search Only) ---
                    this.aiResultsSection.classList.add("hidden"); // Ensure AI section is hidden

                    // Check for exact phrase matching (only when AI is disabled)
                    const hasQuotes = query.startsWith('"') && query.endsWith('"');
                    const exactPhrase = this.extractTextBetweenQuotes(query);
                    const isExactMatch = hasQuotes || exactPhrase !== null;

                    const normalSearchParams = {
                        ...baseSearchParams,
                        attributesToSearchOn: ["title", "plaintext", "excerpt"],
                    };

                    if (isExactMatch) {
                        // Handle exact phrase search (existing logic)
                        const searchPhrase = hasQuotes
                            ? query.slice(1, -1)
                            : exactPhrase;
                        normalSearchParams.matchingStrategy = "all"; // Use 'all' for initial fetch

                        // Perform initial search and then filter manually
                        normalSearchPromise = this.index
                            .search(searchPhrase, normalSearchParams)
                            .then((initialResults) => {
                                if (initialResults.hits.length > 0) {
                                    const lowerPhrase = searchPhrase.toLowerCase();
                                    const filteredHits = initialResults.hits.filter(
                                        (hit) =>
                                            (hit.title &&
                                                hit.title
                                                    .toLowerCase()
                                                    .includes(lowerPhrase)) ||
                                            (hit.plaintext &&
                                                hit.plaintext
                                                    .toLowerCase()
                                                    .includes(lowerPhrase)) ||
                                            (hit.excerpt &&
                                                hit.excerpt
                                                    .toLowerCase()
                                                    .includes(lowerPhrase))
                                    );
                                    // Return the structure MeiliSearch expects, with filtered hits
                                    return {
                                        ...initialResults,
                                        hits: filteredHits,
                                    };
                                }
                                return initialResults; // Return original if no hits initially
                            });
                    } else {
                        // Regular keyword search
                        normalSearchParams.matchingStrategy = "last";
                        normalSearchPromise = this.index.search(
                            query,
                            normalSearchParams
                        );
                    }
                }

                // --- Execute Searches and Process Results ---
                const [aiResults, normalResults] = await Promise.all([
                    aiSearchPromise,
                    normalSearchPromise,
                ]);

                // Update state
                this.state.loading = false;
                this.state.aiResults = aiResults.hits || [];
                this.state.normalResults = normalResults.hits || [];
                this.state.selectedIndex = -1; // Reset selection
                this.state.error = null; // Clear previous errors

                // Update UI
                this.renderResults(); // Call renderResults without arguments

                // Hide loading state
                this.loadingState.classList.remove("active");

                // Show empty state if *both* result sets are empty
                if (
                    this.state.aiResults.length === 0 &&
                    this.state.normalResults.length === 0
                ) {
                    this.emptyState.classList.add("active");
                    this.emptyState.querySelector(".ms-empty-message").textContent =
                        "No results found for your search.";
                }
            } catch (error) {
                console.error("Search error:", error);
                this.state.loading = false;
                this.state.error = error;
                this.state.aiResults = []; // Clear results on error
                this.state.normalResults = [];
                this.loadingState.classList.remove("active");
                this.aiResultsSection.classList.add("hidden"); // Hide AI section on error

                // Show empty state with error message
                this.emptyState.classList.add("active");
                this.emptyState.querySelector(".ms-empty-message").textContent =
                    "An error occurred while searching. Please try again.";

                // Render empty results
                this.renderResults();
            }
        }

        /**
         * Render search results based on current state
         */
        renderResults() {
            // Clear previous results
            this.aiHitsList.innerHTML = "";
            this.normalHitsList.innerHTML = "";

            const query = this.state.query.trim();

            // Render AI Results
            if (this.config.enableAiSearch && this.state.aiResults.length > 0) {
                this.aiResultsSection.classList.remove("hidden");
                this.state.aiResults.forEach((hit) => {
                    const hitElement = this._createHitElement(hit, query);
                    this.aiHitsList.appendChild(hitElement);
                });
            } else {
                this.aiResultsSection.classList.add("hidden");
            }

            // Render Normal Results
            if (this.state.normalResults.length > 0) {
                this.normalResultsSection.classList.remove("hidden"); // Ensure section is visible
                this.state.normalResults.forEach((hit) => {
                    const hitElement = this._createHitElement(hit, query);
                    this.normalHitsList.appendChild(hitElement);
                });
            } else {
                // Optionally hide the "Keyword Matches" section if AI is enabled and has results, but normal doesn't
                // if (this.config.enableAiSearch && this.state.aiResults.length > 0) {
                //     this.normalResultsSection.classList.add('hidden');
                // } else {
                this.normalResultsSection.classList.remove("hidden"); // Default: keep visible if it's the only potential section
                // }
            }

            // Update selection state (important after re-rendering)
            this.updateSelectedResult();
        }

        /**
         * Creates a single hit element (<li>) for the results list.
         * @param {object} hit - The MeiliSearch hit object.
         * @param {string} query - The current search query for highlighting.
         * @returns {HTMLElement} The created list item element.
         * @private
         */
        _createHitElement(hit, query) {
            console.log("--- Processing Hit ---", JSON.stringify(hit)); // DEBUG: Log the raw hit
            const li = document.createElement("li");
            const visibility = hit.visibility || "public"; // Default to public if missing
            console.log("Determined visibility:", visibility); // DEBUG: Log determined visibility

            // --- Helper for basic highlighting ---
            const highlightText = (text, terms) => {
                if (
                    !this.config.enableHighlighting ||
                    !terms ||
                    terms.length === 0 ||
                    !text
                ) {
                    return text;
                }
                let highlightedText = text;
                terms.forEach((term) => {
                    try {
                        const escapedTerm = term.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        );
                        const regex = new RegExp(`(${escapedTerm})`, "gi");
                        highlightedText = highlightedText.replace(
                            regex,
                            "<em>$1</em>"
                        );
                    } catch (e) {
                        console.warn("Error highlighting term:", term, e);
                    }
                });
                return highlightedText;
            };

            // --- Get query terms for basic highlighting ---
            const queryTerms = query
                ? query.split(/\s+/).filter((w) => w.length >= 2)
                : [];

            // --- Create result link (common logic) ---
            const link = document.createElement("a");
            if (hit.url) {
                link.href = hit.url;
            } else if (hit.slug) {
                link.href = `/${hit.slug}`;
            } else {
                link.href = "#";
                link.style.pointerEvents = "none";
            }
            link.classList.add("ms-result-link");
            link.addEventListener("click", (e) => {
                if (link.style.pointerEvents === "none") {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                this.close();
                setTimeout(() => {
                    window.location.href = link.href;
                }, 10);
            });

            // --- Create result item container (common logic) ---
            const resultItem = document.createElement("div");
            resultItem.classList.add("ms-result-item");

            // --- Title ---
            const title = document.createElement("h3");
            title.classList.add("ms-result-title");
            let titleContent = hit.title || "Untitled";

            // --- Excerpt / Content ---
            const excerpt = document.createElement("p");
            excerpt.classList.add("ms-result-excerpt");
            let excerptContent = "";

            // --- Conditional Rendering based on Visibility ---
            if (visibility === "public") {
                // --- Public Post Rendering (Existing Logic) ---

                // Title Highlighting (prefer _formatted)
                const formattedTitle =
                    this.config.enableHighlighting &&
                    (hit._formatted?.title || hit._highlightResult?.title?.value);
                if (formattedTitle) {
                    titleContent = formattedTitle;
                } else {
                    // Fallback to basic highlight if _formatted not available
                    titleContent = highlightText(titleContent, queryTerms);
                }

                // Excerpt Snippet Calculation and Highlighting
                let textContent = hit.plaintext || hit.excerpt || "";
                if (query && this.config.enableHighlighting) {
                    const exactPhrase = this.extractTextBetweenQuotes(query);
                    const hasQuotes = query.startsWith('"') && query.endsWith('"');
                    const phraseToHighlight =
                        exactPhrase || (hasQuotes ? query.slice(1, -1) : null);
                    const wordsToHighlight = phraseToHighlight
                        ? []
                        : queryTerms.sort((a, b) => b.length - a.length);

                    let firstMatchPos = -1;
                    let matchLength = 0;
                    const lowerTextContent = textContent.toLowerCase();

                    if (phraseToHighlight) {
                        const lowerPhrase = phraseToHighlight.toLowerCase();
                        const pos = lowerTextContent.indexOf(lowerPhrase);
                        if (pos !== -1) {
                            firstMatchPos = pos;
                            matchLength = phraseToHighlight.length;
                        }
                    } else {
                        for (const word of wordsToHighlight) {
                            const lowerWord = word.toLowerCase();
                            const pos = lowerTextContent.indexOf(lowerWord);
                            if (
                                pos !== -1 &&
                                (firstMatchPos === -1 || pos < firstMatchPos)
                            ) {
                                firstMatchPos = pos;
                                matchLength = word.length;
                            }
                        }
                    }

                    let tempExcerpt = "";
                    if (firstMatchPos !== -1) {
                        const snippetRadius = 60;
                        const startPos = Math.max(0, firstMatchPos - snippetRadius);
                        const endPos = Math.min(
                            textContent.length,
                            firstMatchPos + matchLength + snippetRadius
                        );
                        tempExcerpt = textContent.substring(startPos, endPos);
                        if (startPos > 0) tempExcerpt = "..." + tempExcerpt;
                        if (endPos < textContent.length)
                            tempExcerpt = tempExcerpt + "...";
                    } else {
                        tempExcerpt =
                            textContent.substring(0, 150) +
                            (textContent.length > 150 ? "..." : "");
                    }

                    excerptContent = tempExcerpt;
                    const termsToHighlight = phraseToHighlight
                        ? [phraseToHighlight]
                        : wordsToHighlight;
                    excerptContent = highlightText(
                        excerptContent,
                        termsToHighlight
                    ); // Use helper
                } else {
                    // Highlighting disabled or no query, use truncated content
                    excerptContent =
                        textContent.substring(0, 150) +
                        (textContent.length > 150 ? "..." : "");
                }
            } else {
                // --- Non-Public Post Rendering (Simpler Logic) ---
                titleContent = hit.title || "Untitled";
                // Use raw excerpt, fallback to truncated plaintext
                // Use raw excerpt only, default to empty string if missing
                excerptContent = hit.excerpt || "";

                // Apply basic highlighting
                titleContent = highlightText(titleContent, queryTerms);
                // excerptContent = highlightText(excerptContent, queryTerms); // Skip highlighting excerpt for non-public
            }
            console.log(
                "Final excerptContent before setting HTML:",
                excerptContent
            ); // DEBUG: Log final excerpt content
            // --- Set content (common logic) ---
            title.innerHTML = titleContent;
            excerpt.innerHTML = excerptContent;
            excerpt.innerHTML = excerptContent;

            // --- Append elements (common logic) ---
            resultItem.appendChild(title);
            resultItem.appendChild(excerpt);
            link.appendChild(resultItem);
            li.appendChild(link);

            return li;
        }
    } // End of GhostMeilisearchSearch class

    // Initialize search if configuration is available
    if (window.__MS_SEARCH_CONFIG__) {
        window.ghostMeilisearchSearch = new GhostMeilisearchSearch(
            window.__MS_SEARCH_CONFIG__
        );
    }

    // Add a utility method to help with initialization
    GhostMeilisearchSearch.initialize = function (config) {
        if (!window.ghostMeilisearchSearch) {
            window.ghostMeilisearchSearch = new GhostMeilisearchSearch(config);
        }
        return window.ghostMeilisearchSearch;
    };

    return GhostMeilisearchSearch;

}));
//# sourceMappingURL=search.js.map

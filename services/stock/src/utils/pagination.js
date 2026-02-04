export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters from query
 */
export const parsePaginationParams = (query) => {
    const page = Math.max(1, parseInt(query.page) || DEFAULT_PAGE);
    const limit = Math.min(
        Math.max(1, parseInt(query.limit) || DEFAULT_LIMIT),
        MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Create standardized pagination response
 */
export const createPaginationResponse = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);

    return {
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

/**
 * Middleware to parse pagination params and attach to req
 */
export const paginationMiddleware = (req, res, next) => {
    const { page, limit, skip } = parsePaginationParams(req.query);

    req.pagination = { page, limit, skip };
    next();
};

/**
 * Parse sorting parameters
 * Example: sort=-createdAt,name => { createdAt: -1, name: 1 }
 */
export const parseSortParams = (sortQuery) => {
    if (!sortQuery) return { createdAt: -1 }; // Default sort

    const sortObj = {};
    const fields = sortQuery.split(',');

    fields.forEach(field => {
        if (field.startsWith('-')) {
            sortObj[field.substring(1)] = -1; // Descending
        } else {
            sortObj[field] = 1; // Ascending
        }
    });

    return sortObj;
};

/**
 * Parse field selection parameters
 * Example: fields=name,email,role => 'name email role'
 */
export const parseFieldsParams = (fieldsQuery) => {
    if (!fieldsQuery) return '';
    return fieldsQuery.split(',').join(' ');
};

/**
 * Advanced query builder for filtering
 */
export const buildFilterQuery = (query, allowedFilters = []) => {
    const filter = {};

    allowedFilters.forEach(field => {
        if (query[field]) {
            // Handle different filter types
            if (query[field].includes(',')) {
                // Multiple values: field=val1,val2
                filter[field] = { $in: query[field].split(',') };
            } else if (query[field].includes('..')) {
                // Range: field=min..max
                const [min, max] = query[field].split('..');
                filter[field] = {};
                if (min) filter[field].$gte = min;
                if (max) filter[field].$lte = max;
            } else {
                // Exact match
                filter[field] = query[field];
            }
        }
    });

    // Handle search query (case-insensitive)
    if (query.search) {
        filter.$or = allowedFilters.map(field => ({
            [field]: { $regex: query.search, $options: 'i' }
        }));
    }

    return filter;
};
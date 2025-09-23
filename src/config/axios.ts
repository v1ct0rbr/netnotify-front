import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';

/*
ERR_FR_TOO_MANY_REDIRECTS: Indicates that the request was redirected too many times.
ERR_BAD_OPTION_VALUE: Occurs when an invalid value is provided for an Axios option.
ERR_BAD_OPTION: Indicates an invalid option was used in the request configuration.
ERR_NETWORK: A general network error, often due to connectivity issues or the server not responding.
ERR_DEPRECATED: Used when a deprecated feature or API is used.
ERR_BAD_RESPONSE: Indicates that the server responded with an error status code (outside the 2xx range).
ERR_BAD_REQUEST: The server returned a 400 status code, indicating a malformed request.
ERR_CANCELED: Occurs when the request is canceled using a cancel token.
ECONNABORTED: The request was aborted, often due to a timeout or page refresh during the request.
ETIMEDOUT: The request timed out.
*/



export const ErrorCodes = {
    NotFound: 404,
    BadRequest: 400,
    Unauthorized: 401,
    Forbidden: 403,
    InternalServerError: 500,
    ServiceUnavailable: 503,
    TooManyRequests: 429,
} as const;


const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api', // Base URL for the API
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',

    },
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token'); // ou useContext/useState
    if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.debug('[api] request Authorization header set:', config.headers.Authorization, 'url:', config.url);
    }
    return config;
});

api.interceptors.response.use(response => {
    response.data = camelcaseKeys(response.data, { deep: true });
    return response;
});

export default api;
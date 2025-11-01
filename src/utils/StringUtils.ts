export const truncate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
}

export const capitalize = (str: string): string => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
}

export const jsonParseSafe = <T>(str: string, defaultValue: T): T => {
    try {
        return JSON.parse(str) as T;
    } catch {
        return defaultValue;
    }
}

export const urlEncode = (str: string): string => {
    return encodeURIComponent(str);
}

export const urlDecode = (str: string): string => {
    return decodeURIComponent(str);
}

export const updateJsonForForm = (jsonStr: string, key: string, value: any): string => {
    try {
        const obj = JSON.parse(jsonStr);
        obj[key] = value;
        return JSON.stringify(obj);
    } catch {
        return jsonStr;
    }
}

/**
 * Escapa um HTML para inclusão segura como valor de string em JSON bruto.
 * Substitui barras, aspas duplas e quebras de linha por suas sequências de escape.
 */
export const htmlToString = (html: string): string => {
    if (typeof html !== 'string') return '';
    return html
        .replace(/\\/g, '\\\\')     // barras invertidas primeiro
        .replace(/"/g, '\\"')       // aspas duplas
        .replace(/\r/g, '\\r')      // carriage return
        .replace(/\n/g, '\\n')      // nova linha
        .replace(/\t/g, '\\t')      // tab
        .replace(/\u2028/g, '\\u2028') // linha separator
        .replace(/\u2029/g, '\\u2029'); // paragraph separator
}

export const unescapeServerHtml = (raw: string): string => {
    if (typeof raw !== 'string') return raw ?? '';
    let s = raw;
    s = s.replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\//g, '/')
        .replace(/\\\\/g, '\\');
    return s;
}

export const generateRandomString = (length: number): string => {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}



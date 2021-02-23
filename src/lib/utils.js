export const sanitize = function(obj) {    
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
};

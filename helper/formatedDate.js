

const formatDate = (date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().split('T')[0] : null;
};


// Format specific fields in an object globally
const formatDateFields = (data, fields = []) => {
    if (Array.isArray(data)) {
        return data.map(item => formatDateFields(item, fields));
    } else {
        fields.forEach(field => {
            if (data[field]) {
                data[field] = formatDate(data[field]);
            }
        });
        return data;
    }
};

module.exports = { formatDate, formatDateFields };

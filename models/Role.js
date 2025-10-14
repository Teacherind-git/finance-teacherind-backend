const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., admin, finance-manager, hr
    permissions: [{ type: String }] // optional: e.g., ['view-finance', 'edit-users']
});

module.exports = mongoose.model('Role', roleSchema);

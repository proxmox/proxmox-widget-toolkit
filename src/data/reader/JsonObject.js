/* A reader to store a single JSON Object (hash) into a storage.
 * Also accepts an array containing a single hash.
 *
 * So it can read:
 *
 * example1: {data1: "xyz", data2: "abc"}
 * returns [{key: "data1", value: "xyz"}, {key: "data2", value: "abc"}]
 *
 * example2: [ {data1: "xyz", data2: "abc"} ]
 * returns [{key: "data1", value: "xyz"}, {key: "data2", value: "abc"}]
 *
 * If you set 'readArray', the reader expexts the object as array:
 *
 * example3: [ { key: "data1", value: "xyz", p2: "cde" },  { key: "data2", value: "abc", p2: "efg" }]
 * returns [{key: "data1", value: "xyz", p2: "cde}, {key: "data2", value: "abc", p2: "efg"}]
 *
 * Note: The records can contain additional properties (like 'p2' above) when you use 'readArray'
 *
 * Additional feature: specify allowed properties with default values with 'rows' object
 *
 * let rows = {
 *   memory: {
 *     required: true,
 *     defaultValue: 512
 *   }
 * }
 *
 */

Ext.define('Proxmox.data.reader.JsonObject', {
    extend: 'Ext.data.reader.Json',
    alias: 'reader.jsonobject',

    readArray: false,

    rows: undefined,

    constructor: function(config) {
        let me = this;

        Ext.apply(me, config || {});

	me.callParent([config]);
    },

    getResponseData: function(response) {
	let me = this;

	let data = [];
        try {
	    let result = Ext.decode(response.responseText);
	    // get our data items inside the server response
	    let root = result[me.getRootProperty()];

	    if (me.readArray) {
		// it can be more convenient for the backend to return null instead of an empty array
		if (root === null) {
		    root = [];
		}
		let rec_hash = {};
		Ext.Array.each(root, function(rec) {
		    if (Ext.isDefined(rec.key)) {
			rec_hash[rec.key] = rec;
		    }
		});

		if (me.rows) {
		    Ext.Object.each(me.rows, function(key, rowdef) {
			let rec = rec_hash[key];
			if (Ext.isDefined(rec)) {
			    if (!Ext.isDefined(rec.value)) {
				rec.value = rowdef.defaultValue;
			    }
			    data.push(rec);
			} else if (Ext.isDefined(rowdef.defaultValue)) {
			    data.push({ key: key, value: rowdef.defaultValue });
			} else if (rowdef.required) {
			    data.push({ key: key, value: undefined });
			}
		    });
		} else {
		    Ext.Array.each(root, function(rec) {
			if (Ext.isDefined(rec.key)) {
			    data.push(rec);
			}
		    });
		}
	    } else {
		// it can be more convenient for the backend to return null instead of an empty object
		if (root === null) {
		    root = {};
		} else if (Ext.isArray(root)) {
		    if (root.length === 1) {
			root = root[0];
		    } else {
			root = {};
		    }
		}

		if (me.rows) {
		    Ext.Object.each(me.rows, function(key, rowdef) {
			if (Ext.isDefined(root[key])) {
			    data.push({ key: key, value: root[key] });
			} else if (Ext.isDefined(rowdef.defaultValue)) {
			    data.push({ key: key, value: rowdef.defaultValue });
			} else if (rowdef.required) {
			    data.push({ key: key, value: undefined });
			}
		    });
		} else {
		    Ext.Object.each(root, function(key, value) {
			data.push({ key: key, value: value });
		    });
		}
	    }
	} catch (ex) {
	    Ext.Error.raise({
		response: response,
		json: response.responseText,
		parseError: ex,
		msg: 'Unable to parse the JSON returned by the server: ' + ex.toString(),
	    });
	}

	return data;
    },
});

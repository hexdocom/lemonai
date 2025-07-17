const read_file = {
  name: "read_file",
  description: "Read the content of a specified file path and return, supports txt, md, xlsx, json formats. For the 'path' parameter, you can use \"$LAST_WRITTEN_FILE_PATH\" to refer to the file created by the most recent successful 'write_code' or other file-writing action in this session.",
  params: {
    type: "object",
    properties: {
      path: {
        description: "The path of the file to read. Can be an absolute path or \"$LAST_WRITTEN_FILE_PATH\".",
        type: "string"
      }
    },
    required: ["path"]
  },
  getActionDescription({ path }) {
    return path;
  }
};

module.exports = read_file;
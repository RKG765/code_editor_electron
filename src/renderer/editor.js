const container = document.getElementById("editor-container");

require(["vs/editor/editor.main"], function () {
  monaco.editor.create(container, {
    value: `function hello() {
  console.log("Hello, AI Code Editor!");
}`,
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
  });
});

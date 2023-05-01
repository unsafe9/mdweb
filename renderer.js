const {MarkdownGraph, MarkdownWatcher} = require('./graph');

window.onload = () => {
    const graphDiv = document.getElementById('graph');
    let graph = new MarkdownGraph(graphDiv, 'examples');
    let watcher = new MarkdownWatcher(graph);
    watcher.start();
    graph.show();
}

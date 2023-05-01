const fs = require('fs');
const path = require('path');
const {markdown} = require('markdown');
const {Network, DataSet} = require('vis-network');
const chokidar = require('chokidar');


class MarkdownGraph {
    constructor(container, directory) {
        this.container = container;
        this.directory = directory;
        this.fileLinks = {};
        this.graph = new Network(container, {}, {
            autoResize: true,
            height: '100%',
            width: '100%',
            edges: {
                arrows: {
                    to: {
                        enabled: true,
                    }
                }
            },
            physics: {
                enabled: true,
            },
        });
    }

    updateFileLinks(file) {
        const filePath = path.join(this.directory, file);
        // parse all links in the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const html = markdown.toHTML(fileContent);
        const soup = new DOMParser().parseFromString(html, 'text/html');
        const links = Array.from(soup.querySelectorAll('a'))
            .map(link => [link.getAttribute('href'), link.textContent])
            .filter(([link, text]) => link && link.endsWith('.md'));

        this.fileLinks[file] = links.map(([link, text]) => path.relative(this.directory, path.join(path.dirname(filePath), link)));
    }

    addNode(file) {
        this.updateFileLinks(file);
        const linkedFiles = this.fileLinks[file];
        const {nodes, edges} = this.graph.body.data;

        // add new node to the graph
        nodes.add({
            id: file,
            label: file,
        });

        // add new edges to the graph
        linkedFiles.forEach(linkedFile => {
            edges.add({
                from: file,
                to: linkedFile,
            });
        });
    }

    updateNode(file) {
        this.updateFileLinks(file);
        const linkedFiles = this.fileLinks[file];

        const {edges} = this.graph.body.data;

        // update edges in graph
        let alreadyAddedFiles = [];
        let needToRemove = [];
        edges.forEach(edge => {
            if (edge.from === file) {
                if (linkedFiles.includes(edge.to)) {
                    alreadyAddedFiles.push(edge.to);
                } else {
                    needToRemove.push(edge);
                }
            }
        });
        needToRemove.forEach(edge => {
            edges.remove(edge);
        });
        linkedFiles.forEach(linkedFile => {
            if (!alreadyAddedFiles.includes(linkedFile)) {
                edges.add({
                    from: file,
                    to: linkedFile,
                });
            }
        });
    }

    removeNode(file) {
        delete this.fileLinks[file];
        const {nodes, edges} = this.graph.body.data;

        // remove connected edges
        this.graph.getConnectedEdges(file).forEach(edgeId => {
            edges.remove(edgeId);
        });

        // remove node
        nodes.remove(file);
    }

    show() {
        this.graph.fit();
    }
}

class MarkdownWatcher {
    constructor(graph) {
        this.graph = graph;
    }

    start() {
        chokidar.watch(this.graph.directory).on('all', (event, filePath) => {
            const file = path.relative(this.graph.directory, filePath);
            if (path.extname(file) === '.md') {
                if (event === 'add') {
                    console.log(file, 'added');
                    this.graph.addNode(file);

                } else if (event === 'change') {
                    console.log(file, 'modified');
                    this.graph.updateNode(file);

                } else if (event === 'unlink') {
                    console.log(file, 'removed');
                    this.graph.removeNode(file);
                }
            }
        });
    }
}

module.exports = {
    MarkdownGraph,
    MarkdownWatcher,
};


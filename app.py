import os
import time
import markdown
import networkx as nx
from bs4 import BeautifulSoup
from pyvis.network import Network
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class MarkdownGraph:
    def __init__(self, directory, output="index.html"):
        self.directory = directory
        self.output = output
        self.links_dict = {}
        self.graph = nx.DiGraph()

        for file in os.listdir(directory):
            if file.endswith(".md"):
                self.update_graph(file, show=False)

    def update_graph(self, file, show=True):
        # parse all links in the file
        with open(os.path.join(self.directory, file), "r") as f:
            html = markdown.markdown(f.read())
            soup = BeautifulSoup(html, "html.parser")
            links = [(link["href"], link.get_text()) for link in soup.find_all("a")]
            linked_files = [os.path.basename(link[0]) for link in links if link[0].endswith(".md")]

        # update links for this file
        self.links_dict[file] = linked_files

        # add new node to the graph
        if not self.graph.has_node(file):
            self.graph.add_node(file)

        # add new edges to the graph
        for linked_file in linked_files:
            if not self.graph.has_edge(file, linked_file):
                self.graph.add_edge(file, linked_file)

        # remove edges that no longer exist
        for neighbor in list(self.graph.neighbors(file)):
            if neighbor not in linked_files:
                self.graph.remove_edge(file, neighbor)

        # remove isolated nodes
        # for node in list(self.graph.nodes):
        #     if self.graph.degree(node) == 0:
        #         self.graph.remove_node(node)

        if show:
            self.show()

    def show(self):
        # render the graph
        net = Network(
            notebook=True,
            directed=True,
            height='800px',
            cdn_resources='remote',
        )
        net.from_nx(self.graph)
        # net.show_buttons(filter_=["physics"])
        net.set_options("""
            var options = {
              "physics": {
                "enabled": true,
                "stabilization": {
                  "fit": true
                }
              }
            }
        """)
        net.show(self.output)


class MarkdownWatcher(FileSystemEventHandler):
    def __init__(self, graph):
        self.graph = graph

    def on_any_event(self, event):
        if event.is_directory:
            return
        if event.event_type == 'created' or event.event_type == 'modified':
            file = os.path.basename(event.src_path)
            if file.endswith(".md"):
                print(f"{file} was {event.event_type}")
                self.graph.update_graph(file)

    def start(self, interval=3):
        observer = Observer()
        observer.schedule(self, path=self.graph.directory, recursive=True)
        observer.start()
        try:
            while True:
                time.sleep(interval)
        except KeyboardInterrupt as e:
            observer.stop()


if __name__ == "__main__":
    graph = MarkdownGraph(directory="examples", output="dist/index.html")
    graph.show()

    watcher = MarkdownWatcher(graph)
    watcher.start(interval=1)

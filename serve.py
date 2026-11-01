"""Servidor local para testar o jogo, sem cache.

O navegador não guarda nenhum arquivo, então uma alteração aparece na próxima
recarga, inclusive no celular.

Uso: python serve.py [porta]     (porta padrão: 8080)
"""
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    # On Windows the registry can map .js to text/plain, which breaks ES modules.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript'}

    def end_headers(self):
        # Never keep a copy: every reload fetches the files as they are now.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def lan_ip():
    """The address other devices on the network, like a phone, can reach this one at."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        try:
            s.connect(('10.255.255.255', 1))  # picks the outgoing interface; sends nothing
            return s.getsockname()[0]
        except OSError:
            return None


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = partial(NoCacheHandler, directory=str(ROOT))
    with ThreadingHTTPServer(('', port), handler) as server:
        print(f'Neste computador:  http://localhost:{port}')
        ip = lan_ip()
        if ip:
            print(f'No celular (mesma rede Wi-Fi):  http://{ip}:{port}')
        print('Ctrl+C para parar.')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()

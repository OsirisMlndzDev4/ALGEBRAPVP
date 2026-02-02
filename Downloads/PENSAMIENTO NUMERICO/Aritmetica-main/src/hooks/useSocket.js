/**
 * @file src/hooks/useSocket.js
 * @description Hook de React para manejar la conexión Socket.IO
 */

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Auto-detect server URL
const getServerUrl = () => {
    // In development, the server runs on port 3001
    const serverPort = 3001;

    // If we're on localhost, connect to localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://localhost:${serverPort}`;
    }

    // Otherwise, use the same host but different port
    return `http://${window.location.hostname}:${serverPort}`;
};

// Singleton socket instance
let socket = null;

/**
 * Hook para obtener la instancia del socket
 * @returns {{ socket: Socket, isConnected: boolean }}
 */
export function useSocket() {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!socket) {
            const serverUrl = getServerUrl();
            console.log('[Socket] Connecting to:', serverUrl);

            socket = io(serverUrl, {
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });
        }

        const handleConnect = () => {
            console.log('[Socket] Connected:', socket.id);
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            console.log('[Socket] Disconnected');
            setIsConnected(false);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        // Check current state
        if (socket.connected) {
            setIsConnected(true);
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, []);

    return { socket, isConnected };
}

/**
 * Hook para suscribirse a eventos del socket
 * @param {string} event - Nombre del evento
 * @param {function} callback - Función a ejecutar cuando llega el evento
 */
export function useSocketEvent(event, callback) {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.on(event, callback);

        return () => {
            socket.off(event, callback);
        };
    }, [socket, event, callback]);
}

/**
 * Obtiene el socket directamente (para uso fuera de componentes)
 */
export function getSocket() {
    return socket;
}

export default useSocket;

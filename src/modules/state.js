export const state = {
    canvas: {
        width: 0,
        height: 0,
        bgColor: '#ffffff',
        zoom: 1,
        panX: 0,
        panY: 0,
        spaceHeld: false,
        pinching: false,
    },
    tool: {
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ',
        fontFamily: 'Comic Neue',
        fontSize: 32,
        color: '#000000',
        strokeWeight: 0,
        spacing: 0.6,
        continueFromLast: true,
    },
    painting: {
        isActive: false,
        charIndex: 0,
        pathPoints: [],
        smoothedAngle: 0,
        lastPlacedPos: null,
    },
    buffer: null,
    liveChars: [],
    settings: {
        locale: localStorage.getItem('ascii-paint-locale') || 'pt-BR',
    },
};

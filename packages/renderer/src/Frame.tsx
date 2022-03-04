import './App.css';

function Frame() {
    return (
        <div>
            <div class="row" id="toolbar">
                <input id="autoComplete" tabindex="1"/>
                <button id="newTab">+</button>
                <button id="channelPicker">C</button>
                <button id="tabDevTools">Tab Tools</button>
                <button id="frameDevTools">Frame Tools</button>
                <button id="signIn">Signin</button>
            </div>
            <div id="tabBar">
            
            </div>
            <div id="contentContainer">
            
            </div>
        </div>
    );
}

export default Frame;
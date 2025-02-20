import {eventOn, eventRemoveListener, tavern_events} from "slash-runner/event";

function hello()
{
    alert("hello");
    eventRemoveListener(tavern_events.MESSAGE_RECEIVED, hello);
}
eventOn(tavern_events.MESSAGE_RECEIVED, hello);

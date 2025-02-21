

function hello()
{
    alert("hello");
    eventRemoveListener(tavern_events.MESSAGE_RECEIVED, hello);
}
eventOn(tavern_events.MESSAGE_RECEIVED, hello);

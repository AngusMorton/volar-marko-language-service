export default class extends Marko.Component {
    declare state: {
        something: string;
    };

    onCreate(input: Input) {
        this.state = {
            ...input,
            something: "else",
        };

        const banana = "string" + input.apple;
        if (banana === 5) {
            console.log("banana is 6");
        }
    }

    clickMe() { console.log("I've been clicked!") }
}
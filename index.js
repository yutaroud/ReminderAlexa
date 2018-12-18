const {canHandle, RemidnerClient, getSlotValueByName } = require('ask-utils')
const Alexa = require('ask-sdk-core');

let skill;
exports.handler = async function (event, context) {
    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                RemindHandler,
                UpdateHandler,
                HelloHandler,
                HelpIntentHandler,
                ExitHandler,
                SessionEndedRequestHandler
            )
            .create();
    }
    return skill.invoke(event);
};

const UpdateHandler = {
    canHandle (handlerInput) {
        return canHandle(handlerInput, 'IntentRequest', 'UpdateIntent')
    },
    async handle (handlerInput){
        const minutes = getSlotValueByName(handlerInput, 'minutes');
        const speechText = 'かしこまりました。皆さんの時間を'+ minutes + '分遅くしておきます。（まだ対応してない）';
        const client = new RemidnerClient(handlerInput);
        const response = await client.fetch('GET');
        await client.fetch('DELETE', '/v1/alerts/reminders/' + response.body.alerts[0].alertToken)
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse()
    }
};

const RemindHandler = {
    canHandle (handlerInput) {
        return canHandle(handlerInput, 'IntentRequest', 'RemindIntent')
    },
    async handle (handlerInput){
        const peoplenum = getSlotValueByName(handlerInput, 'num');
        let speechText = peoplenum + '人ですね。研究室のタイマーをセットしました。';
        if(peoplenum >= 10){
            speechText = "10人以上はちょっと多くて覚えられません・・・。ごめんなさい。";
            console.log(peoplenum);
        }else {
            // ここからリクエスト
            const client = new RemidnerClient(handlerInput);
            const limit_time = 20;
            for (let i = 1; i <= peoplenum; i++) {
                client.setPayload(fifteen_timer(i, limit_time));
                await client.fetch('POST');
                client.setPayload(twenty_timer(i, limit_time));
                await  client.fetch('POST');
            }
            // ここまで
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse()
    }
};

const HelloHandler = {
    canHandle (handlerInput) {
        return canHandle(handlerInput, 'LaunchRequest')
    },

    async handle (handlerInput) {
        const speechText = '今日の発表は何人ですか？。';


        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse()
    }

};

const HelpIntentHandler = {
    canHandle (handlerInput) {
        return canHandle(handlerInput, 'IntentRequest', 'AMAZON.HelpIntent')
    },
    handle (handlerInput) {
        const speechText = '研究室のタイマーをセットしてください。人数を伝えるだけです。';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard("hello", speechText)
            .getResponse()
    }
};

const ExitHandler = {
    canHandle(handlerInput) {
        return canHandle(handlerInput, 'IntentRequest', 'AMAZON.CancelIntent') || canHandle(handlerInput, 'IntentRequest', 'AMAZON.StopIntent')
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak("処理を終了します")
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return canHandle(handlerInput, 'SessionEndedRequest')
    },
    handle(handlerInput) {
        console.log(`SessionEnd`);
        return handlerInput.responseBuilder.getResponse();
    },
};

function fifteen_timer(times, limit_time){
    let plus_time = 60*limit_time*(times-1);
    const date = new Date();
    date.setTime(date.getTime() + 1000*60*60*9);
    return {
        requestTime: date.toISOString(),
        trigger: {
            type: "SCHEDULED_RELATIVE",
            offsetInSeconds: 60*(limit_time-5)+plus_time,
        },
        alertInfo: {
            spokenInfo: {
                content: [{
                    locale: "ja-JP",
                    text: times + "人目の発表から"+ (limit_time-5) +"分が経過しましたよ〜そろそろ終わってください!"
                }]
            }
        },
        pushNotification: {
            status: "ENABLED"
        }
    };
}

function twenty_timer(times, limit_time){
    const date = new Date();
    date.setTime(date.getTime() + 1000*60*60*9);
    return {
        requestTime: date.toISOString(),
        trigger: {
            type: "SCHEDULED_RELATIVE",
            offsetInSeconds: 60*limit_time*times,
        },
        alertInfo: {
            spokenInfo: {
                content: [{
                    locale: "ja-JP",
                    text: times + "人目の発表から"+ limit_time + "分が経過しました。終わりなさい！"
                }]
            }
        },
        pushNotification: {
            status: "ENABLED"
        }
    };
}
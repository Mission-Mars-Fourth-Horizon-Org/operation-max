// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes, MessageFactory, TurnContext, CardFactory } = require('botbuilder');
const { ChoicePrompt, TextPrompt, ConfirmPrompt, DialogSet, WaterfallDialog } = require('botbuilder-dialogs');

// Turn counter property
const TURN_COUNTER_PROPERTY = 'turnCounterProperty';

//dialog properties 
const TICKET_DESC_PROPERTY = "ticket_description";
const TICKET_SEVERITY_PROPERTY = "ticket_severity";
const TICKET_CATEGORY_PROPERTY = "ticket_category";
const ISSUE_TICKET = 'ticket';

const DIALOG_STATE_PROPERTY = 'dialogState';
const NAME_PROMPT = 'name_prompt';
const TICKET_CONFIRMPROMPT = 'ticket_prompt';
const PROBLEM_DESC_PROMPT = "problem_desc";
const SEVERITY_CHOICEPROMPT = "severity_choiceprompt";
const CATEGORY_PROMPT = "category_pmompt";



class MyBot {
  /**
   *
   * @param {ConversationState} conversation state object
   */
  constructor(conversationState) {
    // Creates a new state accessor property.
    // See https://aka.ms/about-bot-state-accessors to learn more about the bot state and state accessors.
    this.countProperty = conversationState.createProperty(TURN_COUNTER_PROPERTY);
    this.conversationState = conversationState;

    this.ticketDesc = this.conversationState.createProperty(TICKET_DESC_PROPERTY);
    this.ticketSeverity = this.conversationState.createProperty(TICKET_SEVERITY_PROPERTY);
    this.ticketCategory = this.conversationState.createProperty(TICKET_CATEGORY_PROPERTY);

    this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);
    this.dialogs = new DialogSet(this.dialogState);

    this.dialogs.add(new TextPrompt(PROBLEM_DESC_PROMPT));
    this.dialogs.add(new ChoicePrompt(SEVERITY_CHOICEPROMPT));
    this.dialogs.add(new TextPrompt(CATEGORY_PROMPT));
    this.dialogs.add(new ConfirmPrompt(TICKET_CONFIRMPROMPT));

    this.dialogs.add(new WaterfallDialog('testme',[
      async function(step){
        await step.sendActivity('hopefully will run');
      }
    ]));

    // Create a dialog that asks the user for the problem, severity & category.
    this.dialogs.add(new WaterfallDialog(ISSUE_TICKET, [
      this.askForIssue.bind(this),
      this.askForSeverity.bind(this),
      this.askForcategory.bind(this),
      this.collectAndConfirmTicket.bind(this),
      this.displayTicket.bind(this)
     ]));
  }

  async askForIssue(step) {
    await step.context.sendActivity('Hi! I\'m the help desk bot and I can help you create a ticket.');
    return await step.prompt(PROBLEM_DESC_PROMPT, 'First, please briefly describe your problem to me.');
  }

  async askForSeverity(step) {
    await this.ticketDesc.set(step.context, step.result);
    var choices = ['high', 'normal', 'low'];
    await step.prompt(SEVERITY_CHOICEPROMPT, 'What is severity?', choices);
  }

  async askForcategory(step) {
    await this.ticketSeverity.set(step.context, step.result.value)
    return await step.prompt(CATEGORY_PROMPT, 'Which would be the category for this ticket (software, hardware, networking, security or other)?');
  }

  async collectAndConfirmTicket(step) {
    await this.ticketCategory.set(step.context, step.result);
    const desc = await this.ticketDesc.get(step.context, null);
    const severity = await this.ticketSeverity.get(step.context, null);

    var message = `Great! I'm going to create a "${desc}" severity ticket in the "${severity}" category. ` +
      `The description I will use is "${step.result}". Can you please confirm that this information is correct?`;
    return await step.prompt(TICKET_CONFIRMPROMPT, message);
  }

  async displayTicket(step){
    //TODO: Call the API & use the card Factory to display the card
    if(step.result){
      await step.context.sendActivity("Your ticket has been registered");
    }
    else
    {
      //end the dialog
      step.context.sendActivity('You have cancel registering the ticket!');
    }
    await step.endDialog();
  }
  /**
   *
   * @param {TurnContext} on turn context object.
   */
  async onTurn(turnContext) {
    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    if (turnContext.activity.type === ActivityTypes.Message) {
      // read from state.

        // Create dialog context
        const dc = await this.dialogs.createContext(turnContext);

        const utterance = (turnContext.activity.text || '').trim().toLowerCase();
        if (utterance === 'cancel') {
            if (dc.activeDialog) {
                await dc.cancelAllDialogs();
                await dc.context.sendActivity(`Ok... Cancelled.`);
            } else {
                await dc.context.sendActivity(`Nothing to cancel.`);
            }
        }
 
        // Continue the current dialog
        if (!turnContext.responded) {
            await dc.continueDialog();
        }
        if (!turnContext.responded) {
          await dc.beginDialog(ISSUE_TICKET);
        }

      //let count = await this.countProperty.get(turnContext);
      //count = count === undefined ? 1 : ++count;
      //await turnContext.sendActivity(`${count}: You said "${turnContext.activity.text}"`);
      // increment and set turn counter.
      //await this.countProperty.set(turnContext, count);
    //} else {
     // await turnContext.sendActivity(`[${turnContext.activity.type} event detected]`);
    //}
    // Save state changes
    await this.conversationState.saveChanges(turnContext);
  }
  }
}

module.exports.MyBot = MyBot;
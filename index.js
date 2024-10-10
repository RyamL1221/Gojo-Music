// Import the discord.js module
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Player } = require('discord-player');
const config = require('./config.json');

// create client and login
const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
    ]
  });

// ready checks
client.once('ready', () => {
    console.log('Ready!');
});
client.on("error", console.error);
client.on("warn", console.warn);

client.login(config.token);
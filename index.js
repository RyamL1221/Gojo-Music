// imports
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  getVoiceConnection,
} = require('@discordjs/voice');
const ytdl = require("@distube/ytdl-core"); 
const config = require('./config.json');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

// ready checks
client.once('ready', () => {
  console.log('Ready!');
});
client.on("error", console.error);
client.on("warn", console.warn);

// Define the slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays audio from a YouTube link')
    .addStringOption((option) =>
      option.setName('url').setDescription('The YouTube URL to play').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnects the bot from the voice channel'),
].map((command) => command.toJSON());

// Register slash commands
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

// Create an audio player
const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'play') {
    const url = interaction.options.getString('url');

    // Check if the user is in a voice channel
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply('You need to be in a voice channel to play music!');
    }

    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    try {
      // Create a stream from the YouTube URL
      const stream = ytdl(url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
      });

      const resource = createAudioResource(stream);
      player.play(resource);
      connection.subscribe(player);

      await interaction.reply(`Now playing: ${url}`);
    } catch (error) {
      console.error('Error playing the video:', error);
      await interaction.reply('There was an error trying to play that video.');
    }
  } else if (commandName === 'disconnect') {
    // Disconnect from the voice channel
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      connection.destroy();
      await interaction.reply('Disconnected from the voice channel.');
    } else {
      await interaction.reply('I am not connected to a voice channel.');
    }
  }
});

// Handle audio player errors
player.on('error', (error) => {
  console.error('Error in audio player:', error);
});

// Login to Discord with token
client.login(config.token);

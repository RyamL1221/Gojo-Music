// imports
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  StreamType,
} = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");
const config = require("../config.json");
const Queue = require("./Queue.js");

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

// ready checks
client.once("ready", () => {
  console.log("Ready!");
});
client.on("error", console.error);
client.on("warn", console.warn);

// Define the slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays audio from a YouTube link")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The YouTube URL to play")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Disconnects the bot from the voice channel"),
  new SlashCommandBuilder()
    .setName("skibidi")
    .setDescription("Only use if you're sigma :nerd:"),
].map((command) => command.toJSON());

// Register slash commands
const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
  try {
    console.log("Deleting old application (/) commands.");
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
    );
    let count = 0;
    for (const command of existingCommands) {
      await rest.delete(
        `${Routes.applicationGuildCommands(config.clientId, config.guildId)}/${command.id}`,
      );
      count++;
    }
    console.log(`Successfully deleted ${count} old application (/) commands.`);

    console.log("Started refreshing application (/) commands.");
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands },
    );
    console.log("Successfully reloaded application (/) commands.");
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

// Initialize the queue
const queue = new Queue();

// Global connection and interaction variable
let currentConnection = null;
let currentInteraction = null;

// Handle interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  currentInteraction = interaction;

  const { commandName } = interaction;
  switch (commandName) {
    case "play": {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply(
          "You need to be in a voice channel to play music!",
        );
      }

      if (!currentConnection) {
        currentConnection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
      }

      const url = interaction.options.getString("url");
      queue.enqueue(url);

      if (
        player.state.status !== AudioPlayerStatus.Playing &&
        player.state.status !== AudioPlayerStatus.Buffering
      ) {
        console.log(`Now playing ${url} !`);
        await interaction.reply(`Now playing ${url} !`);
        playNextInQueue();
      } else {
        console.log(`Added ${url} to queue!`);
        await interaction.reply(`Added ${url} to queue!`);
      }
      break;
    }
    case "disconnect": {
      const voiceChannel = interaction.member.voice.channel;
      if (voiceChannel) {
        await interaction.guild.members.cache
          .get(interaction.member.id)
          .voice.disconnect();
        await interaction.reply(
          "You little skibidi man I'm always too steps ahead",
        );
      } else {
        await interaction.reply("You are not in a voice channel.");
      }
      break;
    }
    case "skibidi": {
      if (currentConnection) {
        queue.clear();
        currentConnection.destroy();
        currentConnection = null;
        currentInteraction = null;
        player.stop();
        player.removeAllListeners();
        player.unpause();

        await interaction.reply("Disconnected from the voice channel.");
      } else {
        await interaction.reply("I am not connected to a voice channel.");
      }
      break;
    }
    default:
      break;
  }
});

// Function to play the next song in the queue
async function playNextInQueue() {
  if (player.state.status === AudioPlayerStatus.Playing || queue.isEmpty())
    return;

  const url = queue.dequeue();
  try {
    const stream = await ytdl(url, {
      filter: "audioonly",
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    player.play(resource);
    currentConnection.subscribe(player);

    player.once(AudioPlayerStatus.Idle, () => {
      playNextInQueue();
    });
  } catch (error) {
    console.error("Error in audio player:", error);
    currentInteraction.channel.send(
      `There was an error playing the URL: ${url}.`,
    );
    playNextInQueue(); // Move to the next song in the queue
  }
}

// Handle audio player errors
player.on("error", (error) => {
  console.error("Error in audio player:", error);
});

// Login to Discord with token
client.login(config.token);

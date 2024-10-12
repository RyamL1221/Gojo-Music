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
        .setRequired(true)
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
    const existingCommands = await rest.get(Routes.applicationCommands(config.clientId));
    let count = 0;
    for (const command of existingCommands) {
      await rest.delete(`${Routes.applicationCommands(config.clientId)}/${command.id}`);
      count++;
    }
    console.log(`Successfully deleted ${count} old application (/) commands.`);

    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
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

// Handle interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "play": {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
          return interaction.reply({
            content: "You need to be in a voice channel to play music!",
            ephemeral: true,
          });
        }

        // Defer the reply if processing might take time
        await interaction.deferReply();

        // Join the voice channel if not already connected
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        const url = interaction.options.getString("url");
        queue.enqueue(url);

        if (
          player.state.status !== AudioPlayerStatus.Playing &&
          player.state.status !== AudioPlayerStatus.Buffering
        ) {
          console.log(`Now playing ${url}!`);
          await interaction.editReply(`Now playing ${url}!`);
          playNextInQueue(interaction, connection);
        } else {
          console.log(`Added ${url} to queue!`);
          await interaction.editReply(`Added ${url} to queue!`);
        }
        break;
      }
      case "disconnect": {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
          return interaction.reply({
            content: "You are not in a voice channel.",
            ephemeral: true,
          });
        }

        // Defer the reply
        await interaction.deferReply();

        // Disconnect the bot
        connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
          connection.destroy();
          queue.clear();
          player.stop();
          await interaction.editReply("Disconnected from the voice channel.");
        } else {
          await interaction.editReply("I am not connected to any voice channel.");
        }
        break;
      }
      case "skibidi": {
        // Defer the reply
        await interaction.deferReply();

        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
          queue.clear();
          connection.destroy();
          player.stop();
          await interaction.editReply("Disconnected from the voice channel.");
        } else {
          await interaction.editReply("I am not connected to any voice channel.");
        }
        break;
      }
      default:
        await interaction.reply({ content: "Unknown command.", ephemeral: true });
        break;
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
    if (interaction.deferred || interaction.replied) {
      interaction.followUp({
        content: "There was an error while executing this command.",
        ephemeral: true,
      });
    } else {
      interaction.reply({
        content: "There was an error while executing this command.",
        ephemeral: true,
      });
    }
  }
});

// Function to play the next song in the queue
async function playNextInQueue(interaction, connection) {
  if (player.state.status === AudioPlayerStatus.Playing || queue.isEmpty()) return;

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
    connection.subscribe(player);

    player.once(AudioPlayerStatus.Idle, () => {
      playNextInQueue(interaction, connection);
    });

    console.log(`Now playing ${url}!`);
    // Optionally notify the user again
    interaction.followUp(`Now playing ${url}!`);
  } catch (error) {
    console.error("Error in audio player:", error);
    interaction.followUp(`There was an error playing the URL: ${url}.`);
    playNextInQueue(interaction, connection); // Move to the next song in the queue
  }
}

// Handle audio player errors
player.on("error", (error) => {
  console.error("Error in audio player:", error);
});

// Login to Discord with token
client.login(config.token);

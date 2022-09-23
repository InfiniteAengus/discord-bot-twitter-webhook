/* eslint-disable no-case-declarations */
const {
  WebhookClient,
  AttachmentBuilder,
  EmbedBuilder,
} = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const path = require('node:path');
const { request } = require('undici');
const { rand } = require('../utils/helper');
const { client, Logs } = require('..');

let botStarted = false;
const adminRoles = [
  '975132608537198612',
  '909104912841969704',
  '974392025552158770',
];

const isAdmin = async (id) => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);

  const member =
    (await guild.members.cache.get(id)) ||
    (await guild.members.fetch(id).catch((error) => {
      console.log(error);
    }));

  for (const memberRole of member._roles) {
    for (const adminRole of adminRoles) {
      if (memberRole === adminRole) return true;
    }
  }
  return false;
};

client.on('messageCreate', async (msg) => {
  if (
    msg.channelId === process.env.DISCORD_CHANNEL_ID &&
    msg.webhookId === '1016057695897391104' &&
    msg.embeds
  ) {
    try {
      const webhookClient = new WebhookClient({
        id: '1016057695897391104',
        token:
          'Kw6qrjeb87wlSdW178pDmsbNYDxIrFYIC2mIi2IJ-DMss6HkJzJ3nti2XyR4HIMZcWIN',
      });
      const newWebHookClient = new WebhookClient({
        id: '1016168004200960051',
        token:
          'EHwDQWRafwcNoCnE1gfY7iU5y7tYnimi-2Ckjaes-YLh2cxd2XYgHEdTZrpZqJLtjh3X',
      });

      const message = await webhookClient.fetchMessage(msg.id);
      // console.log(message.embeds[0].fields);
      if (!message.embeds[0].fields) {
        return;
      }
      let discordId = undefined,
        twitterHandle = undefined;

      for (const obj of message.embeds[0].fields) {
        if (obj.name === 'Discord ID') {
          discordId = obj.value.slice(2, obj.value.length - 1);
        }
        if (obj.name === 'Twitter') {
          twitterHandle = obj.value;
        }
      }

      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
      const user = await guild.members.fetch(discordId);
      const { body } = await request(
        user.displayAvatarURL({ extension: 'jpg' })
      );

      const canvas = Canvas.createCanvas(820, 460);
      const context = canvas.getContext('2d');
      const imagePath = path.join(__dirname, '../assets/image.jpg');
      const background = await Canvas.loadImage(imagePath);
      context.drawImage(background, 0, 0, canvas.width, canvas.height);

      context.font = '17px OPTICopperplate';
      context.fillStyle = '#ffffff';
      context.fillText(twitterHandle, 35, 225);

      const avatar = await Canvas.loadImage(await body.arrayBuffer());

      context.beginPath();
      context.arc(617, 215, 105, 0, Math.PI * 2, true);
      context.closePath();
      context.clip();
      context.drawImage(avatar, 505, 110, 224, 210);

      const attachment = new AttachmentBuilder(await canvas.encode('png'), {
        name: 'discordjs.png',
      });
      const exampleEmbed = new EmbedBuilder()
        .setColor(0xd7003a)
        .setTitle('Akyllers registration')
        .setURL('https://premint.xyz/akyllers')
        .setDescription(
          `Hey! <@${discordId}> Welcome to the den!\nYour registration for [@Akyllers](https://twitter.com/${twitterHandle.slice(
            1
          )}) Has been approved!\n\nTwitter: [${twitterHandle}](https://twitter.com/${twitterHandle})`
        )
        .setImage('attachment://discordjs.png')
        .setTimestamp();

      newWebHookClient.send({ embeds: [exampleEmbed], files: [attachment] });
    } catch (error) {
      console.error('Error trying to send a message:', error);
    }
  }

  if (
    !msg.content.startsWith('!') ||
    (msg.channelId !== process.env.DISCORD_GENERAL_CHANNEL_ID &&
      msg.channelId !== process.env.DISCORD_TEST_CHANNEL_ID)
  ) {
    return;
  }

  const args = msg.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'reveal':
      // eslint-disable no-case-declarations
      if (!botStarted) {
        return;
      }
      const authorName = msg.author.id;
      const log = await Logs.findOne({ where: { name: authorName } });
      if (log) {
        const { updatedAt } = log.dataValues;
        const curDate = new Date();
        const difference = (curDate - updatedAt) / 1000 / 60;
        if (difference < 5) {
          // const errorEmbed = new EmbedBuilder()
          //   .setColor(0xd7003a)
          //   .setDescription(
          //     `🚫 **${msg.author.username}**, you need to wait ${
          //       5 - Math.ceil(difference)
          //     } ${
          //       5 - Math.ceil(difference) === 1 ? 'minute' : 'minutes'
          //     } to use that command again.`
          //   );
          // await msg.reply({ embeds: [errorEmbed] });
          return;
        }
        await Logs.update({ description: '' }, { where: { name: authorName } });
      } else {
        await Logs.create({
          name: authorName,
          description: '',
        });
      }
      const randNum = rand(1, Number(process.env.METADATA_COUNT));

      console.log(randNum);
      // eslint-disable-next-line no-case-declarations
      const exampleEmbed = new EmbedBuilder()
        .setColor(0xd7003a)
        .setImage(`${process.env.METADATA_BASE_URI}/${randNum}.png`);

      msg.reply({ embeds: [exampleEmbed], ephemeral: true });
      break;
    case 'stop':
      if (await isAdmin(msg.author.id)) {
        botStarted = false;
        const errorEmbed = new EmbedBuilder()
          .setColor(0xd7003a)
          .setDescription(':lock:  **Reveal Command** Locked');
        await msg.reply({ embeds: [errorEmbed] });
      }
      break;
    case 'start':
      if (await isAdmin(msg.author.id)) {
        botStarted = true;
        const errorEmbed = new EmbedBuilder()
          .setColor(0xd7003a)
          .setDescription(':unlock:  **Reveal Command** Unlocked');
        await msg.reply({ embeds: [errorEmbed] });
      }
      break;
    default:
      break;
  }
});

client.on('ready', async () => {
  Logs.sync();
  console.log('ready');
});

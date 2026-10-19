"use client";
// The room's actions as its screens call them. Outside the lab they are the
// server actions themselves; inside the lab's frames they go to the lab's own
// match instead (setLabActions), so a seat can be played by hand there.
import * as server from "@/server/actions";

type Handler = (name: string, args: unknown[]) => Promise<unknown>;
let lab: Handler | null = null;

/** The lab's frames take the room's actions over; null gives them back to the server. */
export function setLabActions(handler: Handler | null) {
  lab = handler;
}

// biome-ignore lint/suspicious/noExplicitAny: each action keeps its own signature
const via = <F extends (...args: any[]) => Promise<any>>(name: string, f: F) =>
  ((...args: Parameters<F>) =>
    lab ? (lab(name, args) as ReturnType<F>) : f(...args)) as F;

export const setReady = via("setReady", server.setReady);
export const startGame = via("startGame", server.startGame);
export const updateSettings = via("updateSettings", server.updateSettings);
export const kickPlayer = via("kickPlayer", server.kickPlayer);
export const transferHost = via("transferHost", server.transferHost);
export const playInstead = via("playInstead", server.playInstead);
export const watchInstead = via("watchInstead", server.watchInstead);
export const moveSomeone = via("moveSomeone", server.moveSomeone);
export const mutePlayer = via("mutePlayer", server.mutePlayer);
export const sitChair = via("sitChair", server.sitChair);
export const drawChair = via("drawChair", server.drawChair);
export const chooseTheme = via("chooseTheme", server.chooseTheme);
export const voteTheme = via("voteTheme", server.voteTheme);
export const confirmCard = via("confirmCard", server.confirmCard);
export const unpickCard = via("unpickCard", server.unpickCard);
export const randomPick = via("randomPick", server.randomPick);
export const askQuestion = via("askQuestion", server.askQuestion);
export const answerQuestion = via("answerQuestion", server.answerQuestion);
export const submitGuess = via("submitGuess", server.submitGuess);
export const passTurn = via("passTurn", server.passTurn);
export const validateGuess = via("validateGuess", server.validateGuess);
export const giveUp = via("giveUp", server.giveUp);
export const backToLobby = via("backToLobby", server.backToLobby);
export const replyCard = via("replyCard", server.replyCard);
export const pointAt = via("pointAt", server.pointAt);
export const accuse = via("accuse", server.accuse);
export const dontKnowCard = via("dontKnowCard", server.dontKnowCard);
export const guessCrewCard = via("guessCrewCard", server.guessCrewCard);
export const bidOnLot = via("bidOnLot", server.bidOnLot);
export const foldLot = via("foldLot", server.foldLot);
export const markDone = via("markDone", server.markDone);
export const offerTrade = via("offerTrade", server.offerTrade);
export const answerTrade = via("answerTrade", server.answerTrade);
export const endPresentation = via("endPresentation", server.endPresentation);
export const judgeBoard = via("judgeBoard", server.judgeBoard);
export const rateMission = via("rateMission", server.rateMission);
export const chooseMission = via("chooseMission", server.chooseMission);
export const lineUpLots = via("lineUpLots", server.lineUpLots);
export const guessWhatFor = via("guessWhatFor", server.guessWhatFor);
export const giveVerdict = via("giveVerdict", server.giveVerdict);
export const playCue = via("playCue", server.playCue);
export const markOpeningReady = via(
  "markOpeningReady",
  server.markOpeningReady,
);
export const markShown = via("markShown", server.markShown);
export const rateFoundCharacter = via(
  "rateFoundCharacter",
  server.rateFoundCharacter,
);
export const rateRandomPick = via("rateRandomPick", server.rateRandomPick);
export const reportPlayer = via("reportPlayer", server.reportPlayer);
export const leaveRoom = via("leaveRoom", server.leaveRoom);
export const joinRoom = via("joinRoom", server.joinRoom);

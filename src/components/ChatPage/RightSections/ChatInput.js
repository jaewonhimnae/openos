import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addChatMessage,
  setCurrentEmoticon,
  setEmojiVisible,
  setEmoticonVisible,
} from "../../../redux/actions/chat_actions";
import Alert from "react-bootstrap/Alert";
import { arrayLike, delay } from "../../../common/util";
import { Picker } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css";
import "./EmojiMartCustom.css";
import EmoticonSelector from "../../../common/components/Editor/EmoticonSelector";
import { getDispUserNames } from "../../../common/util/userUtil";
import styled from "styled-components";
import { uploadFile } from "../../../common/ipcCommunication/ipcFile";
import { sendChatMessage } from "../../../common/ipcCommunication/ipcMessage";
import { EchatType } from "../../../enum";
import DragAndDropSupport from "../../../common/components/DragAndDropSupport";

function ChatInput() {
  const dispatch = useDispatch();
  const electron = window.require("electron");
  const { remote } = window.require("electron");

  const {
    currentChatRoom,
    emojiVisible,
    emoticonVisible,
    currentEmoticon,
  } = useSelector((state) => state.chats);
  const [inputValue, setInputValue] = useState("");
  const [isAlreadyTyped, setIsAlreadyTyped] = useState(false);
  const [isAlreadyRoomSelected, setIsAlreadyRoomSelected] = useState(false);

  const inputRef = useRef(null);
  const loginUser = remote.getGlobal("USER");

  useEffect(() => {
    electron.ipcRenderer.on(
      "upload-file-progress",
      (event, uploadKey, uploadedLength, fileLength) => {
        console.log(
          uploadKey,
          ((uploadedLength / fileLength) * 100).toFixed(0) + "%"
        );
      }
    );
    return () => {
      electron.ipcRenderer.removeAllListeners("upload-file-progress");
      dispatch(setEmojiVisible(false));
      dispatch(setEmoticonVisible(false));
      dispatch(setCurrentEmoticon(``));
    };
  }, []);

  const handleSelectFile = async (e) => {
    const files = e.target.files;
    console.log(`file selected: `, files);

    for (let i = 0; i < files.length; i++) {
      const resData = await uploadFile(files[i].path, files[i].path);
      console.log(`file upload complete: `, resData.data);

      const fileInfo = `${files[i].name}|${files[i].size}|SAVE_SERVER|${
        remote.getGlobal("SERVER_INFO").FS.pubip
      };${remote.getGlobal("SERVER_INFO").FS.port}|${resData.data}|`;

      let userNames;
      if (!currentChatRoom.chat_entry_names) {
        userNames = await getDispUserNames(
          currentChatRoom?.chat_entry_ids?.split("|")
        );
      } else {
        userNames = currentChatRoom.chat_entry_names;
      }

      dispatch(
        addChatMessage(
          currentChatRoom.chat_entry_ids,
          userNames,
          fileInfo,
          currentEmoticon ? currentEmoticon : `맑은 고딕`,
          false,
          currentChatRoom.room_key,
          loginUser.userName,
          loginUser.userId,
          EchatType.file.toString()
        )
      );

      await delay(500);
    }
  };

  const onInputValueChange = (e) => {
    if (!currentChatRoom) return;
    setInputValue(e.currentTarget.value);
  };

  const handleDrop = async (files) => {
    if (!currentChatRoom) return;

    for (let i = 0; i < files.length; i++) {
      const resData = await uploadFile(files[i].path, files[i].path);
      console.log(`file upload complete: `, resData.data);

      const fileInfo = `${files[i].name}|${files[i].size}|SAVE_SERVER|${
        remote.getGlobal("SERVER_INFO").FS.pubip
      };${remote.getGlobal("SERVER_INFO").FS.port}|${resData.data}|`;

      let userNames;
      if (!currentChatRoom.chat_entry_names) {
        userNames = await getDispUserNames(
          currentChatRoom?.chat_entry_ids?.split("|")
        );
      } else {
        userNames = currentChatRoom.chat_entry_names;
      }

      dispatch(
        addChatMessage(
          currentChatRoom.chat_entry_ids,
          userNames,
          fileInfo,
          currentEmoticon ? currentEmoticon : `맑은 고딕`,
          false,
          currentChatRoom.room_key,
          loginUser.userName,
          loginUser.userId,
          EchatType.file.toString()
        )
      );

      await delay(500);
    }
  };

  const handleNewLine = (e) => {
    const {
      which,
      nativeEvent: { shiftKey },
    } = e;

    if (which === 13 && !shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleEmojiVisible = () => {
    dispatch(setEmojiVisible(false));
  };

  const handleFocusInput = () => {
    inputRef.current.focus();
  };

  const handleEmoticonPick = () => {
    if (!currentChatRoom) return;
    dispatch(setEmojiVisible(false));
    dispatch(setEmoticonVisible(!emoticonVisible));
  };

  const handleEmojiPick = () => {
    if (!currentChatRoom) return;
    dispatch(setEmoticonVisible(false));
    dispatch(setEmojiVisible(!emojiVisible));
  };

  const handleEmojiClick = (emoji, event) => {
    if (!currentChatRoom) return;
    setInputValue(inputValue + emoji.native);
  };

  const onSubmit = async (event) => {
    if (!currentChatRoom) return;

    let userNames;
    if (!currentChatRoom.chat_entry_names) {
      userNames = await getDispUserNames(
        currentChatRoom?.chat_entry_ids?.split("|")
      );
    } else {
      userNames = currentChatRoom.chat_entry_names;
    }
    if (inputValue.trim().length === 0 && !currentEmoticon) {
      setIsAlreadyTyped(true);
      setTimeout(() => {
        setIsAlreadyTyped(false);
      }, 2000);
      return;
    }
    if (!currentChatRoom) {
      setIsAlreadyRoomSelected(true);
      setTimeout(() => {
        setIsAlreadyRoomSelected(false);
      }, 2000);
      return;
    }

    setInputValue("");
    dispatch(
      addChatMessage(
        currentChatRoom.chat_entry_ids,
        userNames,
        inputValue,
        currentEmoticon ? currentEmoticon : `맑은 고딕`,
        false,
        currentChatRoom.room_key,
        loginUser.userName,
        loginUser.userId,
        currentEmoticon
          ? EchatType.emoticon.toString()
          : EchatType.chat.toString()
      )
    );
    dispatch(setEmojiVisible(false));
    dispatch(setEmoticonVisible(false));
    dispatch(setCurrentEmoticon(``));
  };

  return (
    <>
      {isAlreadyTyped && (
        <div
          style={{
            position: "absolute",
            left: "0",
            bottom: "150px",
            width: "100%",
          }}
        >
          <Alert variant="danger">먼저 글자를 입력해주세요.</Alert>
        </div>
      )}
      {isAlreadyRoomSelected && (
        <div
          style={{
            position: "absolute",
            left: "0",
            bottom: "150px",
            width: "100%",
          }}
        >
          <Alert variant="danger">먼저 방을 선택해주세요.</Alert>
        </div>
      )}

      <div>
        <Picker
          showPreview={false}
          showSkinTones={false}
          emojiTooltip={true}
          onClick={handleEmojiClick}
          style={{
            display: emojiVisible ? `block` : `none`,
          }}
        />
        <Hover emojiVisible={emojiVisible} onClick={handleEmojiVisible}>
          <CloseButton />
        </Hover>
      </div>
      <EmoticonSelector visible={emoticonVisible ? true : false} />

      <div className="chat-input-area">
        <DragAndDropSupport handleDrop={handleDrop}>
          <div className="chat-input-wrap" onClick={handleFocusInput}>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputValue}
              onChange={onInputValueChange}
              placeholder="채팅 내용을 입력해주세요."
              onKeyDown={handleNewLine}
            ></textarea>
            <button
              onClick={onSubmit}
              type="submit"
              style={{ width: "78px", height: "48px" }}
              className="btn-ghost-m"
            >
              전송
            </button>
          </div>
        </DragAndDropSupport>

        <div className="input-action-wrap">
          <div
            className="input-action btn-txt"
            title="텍스트 (글꼴, 크기, 색상,표)"
          ></div>
          <div
            className="input-action btn-emoticon"
            title="이모티콘"
            onClick={handleEmoticonPick}
          ></div>
          <div
            className="input-action btn-emoji"
            title="이모지"
            onClick={handleEmojiPick}
          ></div>
          <div class="input-action-file-wrapper">
            <label for="btn-add-file">
              <div className="input-action btn-add-file" title="파일전송"></div>
            </label>
            {currentChatRoom ? (
              <input
                type="file"
                multiple="multiple"
                id="btn-add-file"
                class="btn-add-file"
                onChange={handleSelectFile}
              />
            ) : (
              <div class="btn-add-file"></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const Hover = styled.div`
  display: ${(props) => (props.emojiVisible ? `block` : `none`)};
  position: absolute;
  bottom: 480px;
  right: 10px;
  padding: 5px 10px;
  border-radius: 50%;
  &:hover {
    background-color: #dfe2e8;
    cursor: pointer;
  }
`;

const CloseButton = styled.div`
  background-image: url(./images/btn_close.png);
  width: 10px;
  height: 20px;
  background-repeat: no-repeat;
  background-position: 0px center;
`;

export default ChatInput;

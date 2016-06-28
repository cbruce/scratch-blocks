/**
 * AccessibleBlockly
 *
 * Copyright 2016 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Angular2 Service that handles tree keyboard navigation.
 * This is a singleton service for the entire application.
 *
 * @author madeeha@google.com (Madeeha Ghori)
 */

blocklyApp.TreeService = ng.core
  .Class({
    constructor: function() {
      // Keeping track of whether the user has just focused into an input
      // field. In the next keystroke, if the user navigates away from the
      // field using the arrow keys, we want to shift focus back to the tree as
      // a whole.
      this.justFocusedIntoField_ = false;
      // Stores active descendant ids for each tree in the page.
      this.activeDescendantIds_ = {};
    },
    getToolboxTreeNode_: function() {
      return document.getElementById('blockly-toolbox-tree');
    },
    getWorkspaceToolbarButtonNodes_: function() {
      return Array.from(document.querySelectorAll(
          'button.blocklyWorkspaceToolbarButton'));
    },
    // Returns a list of all top-level workspace tree nodes on the page.
    getWorkspaceTreeNodes_: function() {
      return Array.from(document.querySelectorAll('ol.blocklyWorkspaceTree'));
    },
    // Returns a list of all top-level tree nodes on the page.
    getAllTreeNodes_: function() {
      var treeNodes = [this.getToolboxTreeNode_()];
      treeNodes = treeNodes.concat(this.getWorkspaceToolbarButtonNodes_());
      treeNodes = treeNodes.concat(this.getWorkspaceTreeNodes_());
      return treeNodes;
    },
    isTopLevelWorkspaceTree: function(treeId) {
      return this.getWorkspaceTreeNodes_().some(function(tree) {
        return tree.id == treeId;
      });
    },
    getNodeToFocusOnWhenTreeIsDeleted: function(deletedTreeId) {
      // This returns the node to focus on after the deletion happens.
      // We shift focus to the next tree (if it exists), otherwise we shift
      // focus to the previous tree.
      var trees = this.getAllTreeNodes_();
      for (var i = 0; i < trees.length; i++) {
        if (trees[i].id == deletedTreeId) {
          if (i + 1 < trees.length) {
            return trees[i + 1];
          } else if (i > 0) {
            return trees[i - 1];
          }
        }
      }

      return this.getToolboxTreeNode_();
    },
    focusOnCurrentTree_: function(treeId) {
      var trees = this.getAllTreeNodes_();
      for (var i = 0; i < trees.length; i++) {
        if (trees[i].id == treeId) {
          trees[i].focus();
          return true;
        }
      }
      return false;
    },
    focusOnNextTree_: function(treeId) {
      var trees = this.getAllTreeNodes_();
      for (var i = 0; i < trees.length - 1; i++) {
        if (trees[i].id == treeId) {
          trees[i + 1].focus();
          return true;
        }
      }
      return false;
    },
    focusOnPreviousTree_: function(treeId) {
      var trees = this.getAllTreeNodes_();
      for (var i = trees.length - 1; i > 0; i--) {
        if (trees[i].id == treeId) {
          trees[i - 1].focus();
          return true;
        }
      }
      return false;
    },
    getActiveDescId: function(treeId) {
      return this.activeDescendantIds_[treeId] || '';
    },
    unmarkActiveDesc_: function(activeDescId) {
      var activeDesc = document.getElementById(activeDescId);
      if (activeDesc) {
        activeDesc.classList.remove('blocklyActiveDescendant');
        activeDesc.setAttribute('aria-selected', 'false');
      }
    },
    markActiveDesc_: function(activeDescId) {
      var newActiveDesc = document.getElementById(activeDescId);
      newActiveDesc.classList.add('blocklyActiveDescendant');
      newActiveDesc.setAttribute('aria-selected', 'true');
    },
    // Runs the given function while preserving the focus and active descendant
    // for the given tree.
    runWhilePreservingFocus: function(func, treeId) {
      var activeDescId = this.getActiveDescId(treeId);
      this.unmarkActiveDesc_(activeDescId);
      func();

      // The timeout is needed in order to give the DOM time to stabilize
      // before setting the new active descendant, especially in cases like
      // pasteAbove().
      var that = this;
      setTimeout(function() {
        that.markActiveDesc_(activeDescId);
        that.activeDescendantIds_[treeId] = activeDescId;
        document.getElementById(treeId).focus();
      }, 0);
    },
    // Make a given node the active descendant of a given tree.
    setActiveDesc: function(newActiveDescId, treeId) {
      this.unmarkActiveDesc_(this.getActiveDescId(treeId));
      this.markActiveDesc_(newActiveDescId);
      this.activeDescendantIds_[treeId] = newActiveDescId;
    },
    onWorkspaceToolbarKeypress: function(e, treeId) {
      if (e.keyCode == 9) {
        // Tab key.
        if (e.shiftKey) {
          this.focusOnPreviousTree_(treeId);
        } else {
          this.focusOnNextTree_(treeId);
        }
        e.preventDefault();
        e.stopPropagation();
      }
    },
    isButtonOrFieldNode_: function(node) {
      return ['BUTTON', 'INPUT'].indexOf(node.tagName) != -1;
    },
    onKeypress: function(e, tree) {
      var treeId = tree.id;
      var activeDesc = document.getElementById(this.getActiveDescId(treeId));
      if (!activeDesc) {
        console.log('ERROR: no active descendant for current tree.');
        return;
      }

      var isFocusingIntoField = false;

      if (e.keyCode == 13) {
        // Enter key. The user wants to interact with a child.
        if (activeDesc.children.length == 1) {
          var child = activeDesc.children[0];
          if (child.tagName == 'BUTTON') {
            child.click();
            this.isFocusingIntoField = true;
          } else if (child.tagName == 'INPUT') {
            child.focus();
          }
        }
      } else if (e.keyCode == 9) {
        // Tab key.
        if (e.shiftKey) {
          this.focusOnPreviousTree_(treeId);
        } else {
          this.focusOnNextTree_(treeId);
        }
        e.preventDefault();
        e.stopPropagation();
      } else if (e.keyCode >= 37 && e.keyCode <= 40) {
        // Arrow keys.

        // If the user has just focused into a text field, shift focus back to
        // the main tree.
        if (this.justFocusedIntoField_) {
          this.focusOnCurrentTree_(treeId);
        }

        if (e.keyCode == 37) {
          // Left arrow key. Go up a level, if possible.
          var nextNode = activeDesc.parentNode;
          if (this.isButtonOrFieldNode_(activeDesc)) {
            nextNode = nextNode.parentNode;
          }
          while (nextNode && nextNode.tagName != 'LI') {
            nextNode = nextNode.parentNode;
          }
          if (nextNode) {
            this.setActiveDesc(nextNode.id, treeId);
          }
        } else if (e.keyCode == 38) {
          // Up arrow key. Go to the previous sibling, if possible.
          var prevSibling = this.getPreviousSibling(activeDesc);
          if (prevSibling) {
            this.setActiveDesc(prevSibling.id, treeId);
          }
        } else if (e.keyCode == 39) {
          // Right arrow key. Go down a level, if possible.
          var firstChild = this.getFirstChild(activeDesc);
          if (firstChild) {
            this.setActiveDesc(firstChild.id, treeId);
          }
        } else if (e.keyCode == 40) {
          // Down arrow key. Go to the next sibling, if possible.
          var nextSibling = this.getNextSibling(activeDesc);
          if (nextSibling) {
            this.setActiveDesc(nextSibling.id, treeId);
          }
        }

        e.preventDefault();
        e.stopPropagation();
      }

      this.justFocusedIntoField_ = isFocusingIntoField;
    },
    getFirstChild: function(element) {
      if (!element) {
        return element;
      } else {
        var childList = element.children;
        for (var i = 0; i < childList.length; i++) {
          if (childList[i].tagName == 'LI') {
            return childList[i];
          } else {
            var potentialElement = this.getFirstChild(childList[i]);
            if (potentialElement) {
              return potentialElement;
            }
          }
        }
        return null;
      }
    },
    getNextSibling: function(element) {
      if (element.nextElementSibling) {
        // If there is a sibling, find the list element child of the sibling.
        var node = element.nextElementSibling;
        if (node.tagName == 'LI') {
          return node;
        } else {
          // getElementsByTagName returns in DFS order, therefore the first
          // element is the first relevant list child.
          return node.getElementsByTagName('li')[0];
        }
      } else {
        var parent = element.parentNode;
        while (parent && parent.tagName != 'OL') {
          if (parent.nextElementSibling) {
            var node = parent.nextElementSibling;
            if (node.tagName == 'LI') {
              return node;
            } else {
              return this.getFirstChild(node);
            }
          } else {
            parent = parent.parentNode;
          }
        }
        return null;
      }
    },
    getPreviousSibling: function(element) {
      if (element.previousElementSibling) {
        var sibling = element.previousElementSibling;
        if (sibling.tagName == 'LI') {
          return sibling;
        } else {
          return this.getLastChild(sibling);
        }
      } else {
        var parent = element.parentNode;
        while (parent) {
          if (parent.tagName == 'OL') {
            break;
          }
          if (parent.previousElementSibling) {
            var node = parent.previousElementSibling;
            if (node.tagName == 'LI') {
              return node;
            } else {
              // Find the last list element child of the sibling of the parent.
              return this.getLastChild(node);
            }
          } else {
            parent = parent.parentNode;
          }
        }
        return null;
      }
    },
    getLastChild: function(element) {
      if (!element) {
        return element;
      } else {
        var childList = element.children;
        for (var i = childList.length - 1; i >= 0; i--) {
          // Find the last child that is a list element.
          if (childList[i].tagName == 'LI') {
            return childList[i];
          } else {
            var potentialElement = this.getLastChild(childList[i]);
            if (potentialElement) {
              return potentialElement;
            }
          }
        }
        return null;
      }
    }
});

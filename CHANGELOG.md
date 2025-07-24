### Changelog

Note: Versions 1.0.4 and earlier are beta versions with functional defects, please do not use

### 1.0.0

- Beta version with functional defects, do not use
- Initialization
- Add basic methods

### 1.0.1

- Beta version with functional defects, do not use

### 1.0.2

- Beta version with functional defects, do not use

### 1.0.3

- Beta version with functional defects, do not use

### 1.0.4

- Beta version with functional defects, do not use

### 1.0.5

- Fix upload defects

### 1.0.6

- Remove redundant modules, no functional changes

## 1.0.7

- Improve documentation and changelog

## 1.0.8 - 1.0.16

- Beta version, only supports partial functionality

## 1.0.17

- Stable version with basic large file upload functionality

## 1.0.18

- Add upload speed callback function
- Add file hash calculation

## 1.0.19

- Fix bug where speed callback function not called on second upload

## 1.0.20

- Add option to choose between async or sync hash calculation

## 1.0.21

- No functional changes, only update documentation, add React hooks usage example

## 1.0.22

- Add optional parameter startOffset to specify starting chunk index for upload
- Add optional parameter includeChunks to specify which chunks to upload
- If both startOffset and includeChunks exist and startOffset is not 0, startOffset takes priority

## 1.0.23

- No functional changes, only update documentation, add GitHub address

## 1.0.24

- No functional changes, only update documentation, update GitHub address

## 1.0.25

- Test TS type support-----Beta version, do not use

## 1.0.26

- Test TS type support-----Beta version, do not use

## 1.0.27

- Add TS type support

## 1.0.28

- Fix retry upload bug
- Add file, errorMsg and totalChunks data to state
- More friendly error messages on upload failure

## 1.0.29

- Fix file hash calculation anomaly issue

## 1.0.30

- No functional changes, only update README documentation

## 1.0.31

- No functional changes, only update README documentation

## 1.0.32

- No functional changes, only update README documentation

## 1.0.33

- No functional changes, only update README documentation

## 1.0.34

- No functional changes, add online demo address

## 2.0.35

- Add reset upload function
- Improve TS type descriptions

# 2.1.0
Hash restructuring phase 1:
- Restructure hash calculation logic
- Add hashMap for all chunks
- Return all chunks

# 2.2.0
Hash restructuring phase 2:
- Restructure hash calculation logic
- Add checker function
- Re-enable onError callback

# 2.3.0-beta.1
- Optimize onSuccess callback
- Optimize reset function
- Other minor changes

# 2.3.0-rc.1
- Fix infinite loop in pause function
- Add TS type exports

# 2.3.0-rc.2
- Fix multiple hash package import issue

# 2.3.0
- Fix error callback function parameter bug
- Comprehensive testing

# 2.3.1
- Add and fix TS types

# 2.3.2
- Add and fix TS types
- Add documentation address

# 2.3.3
- No functional changes, only update documentation

# 2.3.4
- No functional changes, only update documentation

# 2.3.5
- Add and fix TS types

# 2.3.6
- Support custom hash calculation
- Update readme documentation
